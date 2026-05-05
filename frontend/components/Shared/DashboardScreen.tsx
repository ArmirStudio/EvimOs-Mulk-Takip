import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Pressable, Linking,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import type { AdCampaign } from '@shared/campaign';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { tr } from '../../app/translations';
import { brand } from '../../constants/brand';
import { getTeamReport, listDashboardCampaigns } from '../../services/appApi';
import { formatCurrency } from '../../utils/propertyHelpers';
import { supabase } from '../../services/supabase';
import { useUserData } from '../../hooks/useUserData';
import { DashboardStatCard } from './DashboardStatCard';
import CalendarWidget from './CalendarWidget';
import DashboardMarketingSection from './DashboardMarketingSection';
import InterstitialAdModal from './InterstitialAdModal';
import AnimatedHeaderScrollView from './AnimatedHeaderScrollView';
import AnimatedScreen from './AnimatedScreen';
import PendingApprovalScreen from './PendingApprovalScreen';
import { getOfficeOwnerId, hasFullEmployeeAccess } from '../../utils/employeeAccess';
import { getMaintenanceNextAction, getMaintenanceStatusMeta, getMaintenanceStatusTone } from '../../utils/maintenancePresentation';
import type { TeamReportPayload } from '../../services/teamTypes';

// ─── Rol bazlı banner alt yazıları ───────────────────────────────────────────
const BANNER_SUB: Record<string, string> = {
  agent:    tr.agent.bannerSub,
  landlord: 'Mülk yönetiminin tam kontrolü sizde.',
  tenant:   'Bugün emlak sektöründeki en iyi fırsatları keşfedin.',
};

// ─── Tipler ──────────────────────────────────────────────────────────────────
interface AgentStats {
  totalProperties: number;
  occupied: number;
  vacant: number;
  pendingMaintenance: number;
}

interface LandlordStats {
  total_properties: number;
  occupied_properties: number;
  approved_receipts: number;
  pending_receipts: number;
}

interface Activity {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

interface MaintenanceSummary {
  pending: number;
  inProgress: number;
  completed: number;
  awaitingApproval: number;
  critical: number;
  latest: any[];
}

interface TenantSupportContact {
  id: string;
  role: 'agent' | 'landlord';
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

const isMaintenanceType = (type?: string) =>
  type === 'maintenance' || type === 'maintenance_request';

function buildMaintenanceSummary(rows: any[]): MaintenanceSummary {
  const pending = rows.filter((item) => item.status === 'pending').length;
  const inProgress = rows.filter((item) => item.status === 'in_progress').length;
  const completed = rows.filter((item) => item.status === 'completed').length;
  const awaitingApproval = rows.filter(
    (item) => item.status === 'completed' && !item.tenant_approved_at
  ).length;
  const critical = rows.filter((item) => item.priority === 'high').length;

  return {
    pending,
    inProgress,
    completed,
    awaitingApproval,
    critical,
    latest: rows.slice(0, 3),
  };
}

function getDisplayName(fullName?: string | null, email?: string | null) {
  const trimmedName = fullName?.trim();
  if (trimmedName) return trimmedName.split(/\s+/)[0];

  return 'Kullanıcı';
}

function getTodayGreetingDate() {
  const formatted = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
  });

  return `Bugün ${formatted}`;
}

export default function DashboardScreen() {
  const theme = useAppTheme();
  const s = useStyles();
  const params = useLocalSearchParams<{ openPanel?: string }>();
  const { userData, loading: userLoading, reload: reloadUser } = useUserData();

  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Agent state
  const [agentStats, setAgentStats] = useState<AgentStats>({
    totalProperties: 0, occupied: 0, vacant: 0, pendingMaintenance: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [agentMaintenanceSummary, setAgentMaintenanceSummary] = useState<MaintenanceSummary>({
    pending: 0,
    inProgress: 0,
    completed: 0,
    awaitingApproval: 0,
    critical: 0,
    latest: [],
  });

  // Landlord state
  const [landlordStats, setLandlordStats] = useState<LandlordStats | null>(null);
  const [landlordTenantCount, setLandlordTenantCount] = useState(0);
  const [monthlyRentTotal, setMonthlyRentTotal] = useState(0);
  const [monthlyChartData, setMonthlyChartData] = useState<{ label: string; value: number }[]>([]);
  const [landlordMaintenanceSummary, setLandlordMaintenanceSummary] = useState<MaintenanceSummary>({
    pending: 0,
    inProgress: 0,
    completed: 0,
    awaitingApproval: 0,
    critical: 0,
    latest: [],
  });

  // Tenant state
  const [tenantProperty, setTenantProperty] = useState<any>(null);
  const [tenantMaintenanceSummary, setTenantMaintenanceSummary] = useState<MaintenanceSummary>({
    pending: 0,
    inProgress: 0,
    completed: 0,
    awaitingApproval: 0,
    critical: 0,
    latest: [],
  });
  const [tenantSupportContacts, setTenantSupportContacts] = useState<TenantSupportContact[]>([]);

  // Ad campaigns state
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([]);
  const [activeInterstitial, setActiveInterstitial] = useState<AdCampaign | null>(null);
  const [teamReportPreview, setTeamReportPreview] = useState<TeamReportPayload | null>(null);
  const [teamReportPreviewLoading, setTeamReportPreviewLoading] = useState(false);

  // Ekrana odaklanıldığında kullanıcı verisini yenile
  useFocusEffect(
    useCallback(() => {
      reloadUser();
    }, [reloadUser])
  );

  // Okunmamış bildirim sayısını çek
  useEffect(() => {
    if (!userData?.id) return;
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userData.id)
      .eq('read', false)
      .then(({ count }) => setUnreadCount(count ?? 0));
  }, [userData?.id]);

  // Bildirim paneli açılınca bildirimleri çek ve okundu işaretle
  const handleOpenNotifications = useCallback(async () => {
    if (!userData?.id) return;
    setNotifVisible(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
    // Tümünü okundu işaretle
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userData.id)
      .eq('read', false);
    setUnreadCount(0);
  }, [userData?.id]);

  useEffect(() => {
    if (params.openPanel === 'notifications' && userData?.id) {
      handleOpenNotifications();
      router.replace('/agent/dashboard' as never);
    }
  }, [handleOpenNotifications, params.openPanel, userData?.id]);

  const fetchAgentData = useCallback(async () => {
    setDataLoading(true);
    try {
      const idColumn = userData?.role === 'employee' && !hasFullEmployeeAccess(userData)
        ? 'employee_id'
        : 'agent_id';
      const idValue = idColumn === 'employee_id'
        ? userData?.id
        : (getOfficeOwnerId(userData) || userData?.id);
      const { data: props, error: pErr } = await supabase
        .from('properties')
        .select('id, status, address, city, district')
        .eq(idColumn, idValue);
      const propertyIds = (props || []).map((p: any) => p.id);
      const propertyMap = new Map(
        (props || []).map((p: any) => [p.id, [p.address, p.city, p.district].filter(Boolean).join(', ') || 'Bilinmeyen Mülk'])
      );

      const { count: mCount } = await supabase
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .in('property_id', propertyIds.length > 0 ? propertyIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('status', 'pending');

      if (!pErr && props) {
        const total = props.length;
        const occ = props.filter((p: any) => p.status === 'occupied').length;
        setAgentStats({ totalProperties: total, occupied: occ, vacant: total - occ, pendingMaintenance: mCount || 0 });
      }

      if (pErr || propertyIds.length === 0) {
        setRecentActivities([]);
        setAgentMaintenanceSummary(buildMaintenanceSummary([]));
        return;
      }

      const [maintenanceRes, receiptRes] = await Promise.all([
        supabase
          .from('maintenance_requests')
          .select('id, title, description, created_at, property_id')
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('receipts')
          .select('id, receipt_type, amount, created_at, property_id')
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const maintenanceActivities: Activity[] = (maintenanceRes.data || []).map((item: any) => ({
        id: item.id,
        title: item.title || 'Yeni Arıza Talebi',
        message: propertyMap.get(item.property_id) || item.description || 'Mülk bilgisi bulunamadı',
        type: 'maintenance',
        created_at: item.created_at,
      }));

      const receiptActivities: Activity[] = (receiptRes.data || []).map((item: any) => ({
        id: item.id,
        title: 'Yeni Ödeme Kaydı',
        message: [
          propertyMap.get(item.property_id),
          item.receipt_type ? `Tür: ${item.receipt_type}` : null,
          item.amount ? formatCurrency(Number(item.amount)) : null,
        ].filter(Boolean).join(' • '),
        type: 'receipt',
        created_at: item.created_at,
      }));

      setRecentActivities(
        [...maintenanceActivities, ...receiptActivities]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
      );

      const { data: maintenanceRows } = await supabase
        .from('maintenance_requests')
        .select('id, title, status, priority, updated_at, created_at, tenant_approved_at')
        .in('property_id', propertyIds)
        .order('updated_at', { ascending: false })
        .limit(6);

      setAgentMaintenanceSummary(buildMaintenanceSummary(maintenanceRows || []));
    } catch {
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [userData]);

  const fetchLandlordData = useCallback(async (userId: string) => {
    setDataLoading(true);
    try {
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id,status,tenant_id')
        .eq('landlord_id', userId);

      if (propertiesError) throw propertiesError;

      const propertyIds = (properties || []).map((p: any) => p.id);
      const occupiedCount = (properties || []).filter((p: any) => p.status === 'occupied').length;
      const tenantCount = new Set((properties || []).map((p: any) => p.tenant_id).filter(Boolean)).size;
      setLandlordTenantCount(tenantCount);

      if (propertyIds.length === 0) {
        setLandlordStats({ total_properties: 0, occupied_properties: 0, approved_receipts: 0, pending_receipts: 0 });
        setLandlordTenantCount(0);
        setMonthlyRentTotal(0);
        setMonthlyChartData([]);
        setLandlordMaintenanceSummary(buildMaintenanceSummary([]));
        return;
      }

      const [approvedRes, pendingRes] = await Promise.all([
        supabase.from('receipts').select('*', { count: 'exact', head: true }).in('property_id', propertyIds).eq('status', 'approved'),
        supabase.from('receipts').select('*', { count: 'exact', head: true }).in('property_id', propertyIds).eq('status', 'pending'),
      ]);

      if (approvedRes.error || pendingRes.error) throw new Error(tr.errors.loadFailed);

      setLandlordStats({
        total_properties: propertyIds.length,
        occupied_properties: occupiedCount,
        approved_receipts: approvedRes.count || 0,
        pending_receipts: pendingRes.count || 0,
      });

      // Son 6 ay grafik verisi + bu ay geliri
      const { data: allMonthlyReceipts } = await supabase
        .from('receipts')
        .select('amount, month, created_at')
        .in('property_id', propertyIds)
        .eq('status', 'approved');
        // Removed gte filter to ensure all relevant receipts are fetched and handled in JS

      // Bu ay geliri
      const now2 = new Date();
      const thisMonthStr = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}`;
      const thisMonthTotal = (allMonthlyReceipts || [])
        .filter((r: any) => (r.month || r.created_at?.substring(0, 7)) === thisMonthStr)
        .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
      setMonthlyRentTotal(thisMonthTotal);

      // Grafik verisi
      const chartData: { label: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('tr-TR', { month: 'short' });
        const sum = (allMonthlyReceipts || [])
          .filter((r: any) => (r.month || r.created_at?.substring(0, 7)) === monthStr)
          .reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
        chartData.push({ label, value: sum });
      }
      setMonthlyChartData(chartData);

      const { data: maintenanceRows } = await supabase
        .from('maintenance_requests')
        .select('id, title, status, priority, updated_at, created_at, tenant_approved_at')
        .in('property_id', propertyIds)
        .order('updated_at', { ascending: false })
        .limit(6);
      setLandlordMaintenanceSummary(buildMaintenanceSummary(maintenanceRows || []));
    } catch {
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchTenantProperty = useCallback(async (userId: string) => {
    setDataLoading(true);
    try {
      const { data: prop } = await supabase
        .from('properties')
        .select('id, address, city, district, monthly_rent, dues_amount, deposit_amount, contract_start, contract_end, images, rent_day, agent_id, landlord_id')
        .eq('tenant_id', userId)
        .maybeSingle();
      setTenantProperty(prop || null);
      setTenantSupportContacts([]);

      if (prop?.id) {
        const contacts: TenantSupportContact[] = [];

        if (prop.agent_id) {
          const { data: agentRow } = await supabase
            .from('users')
            .select('id, full_name, email, phone')
            .eq('id', prop.agent_id)
            .maybeSingle();
          if (agentRow) {
            contacts.push({ ...agentRow, role: 'agent' });
          }
        }

        if (prop.landlord_id) {
          const { data: landlordRow } = await supabase
            .from('users')
            .select('id, full_name, email, phone')
            .eq('id', prop.landlord_id)
            .maybeSingle();
          if (landlordRow) {
            contacts.push({ ...landlordRow, role: 'landlord' });
          }
        }

        setTenantSupportContacts(contacts);

        const { data: maintenanceRows } = await supabase
          .from('maintenance_requests')
          .select('id, title, status, priority, updated_at, created_at, tenant_approved_at')
          .eq('property_id', prop.id)
          .order('updated_at', { ascending: false })
          .limit(6);
        setTenantMaintenanceSummary(buildMaintenanceSummary(maintenanceRows || []));
      } else {
        setTenantMaintenanceSummary(buildMaintenanceSummary([]));
      }
    } catch {
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Kampanya fetch + hedefleme ─────────────────────────────────────────────
  const fetchTeamReportPreview = useCallback(async () => {
    if (!userData || !['agent', 'employee'].includes(userData.role)) {
      setTeamReportPreviewLoading(false);
      setTeamReportPreview(null);
      return;
    }

    if (userData.role === 'employee' && !hasFullEmployeeAccess(userData)) {
      setTeamReportPreviewLoading(false);
      setTeamReportPreview(null);
      return;
    }

    try {
      setTeamReportPreviewLoading(true);
      const payload = await getTeamReport('this_week');
      setTeamReportPreview(payload);
    } catch {
      setTeamReportPreview(null);
    } finally {
      setTeamReportPreviewLoading(false);
    }
  }, [userData]);

  const fetchAdCampaigns = useCallback(async () => {
    if (!userData?.id || !userData?.role) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await listDashboardCampaigns();
      const matched = response.campaigns || [];
      // Agency bilgisini al (hedefleme için)
      setAdCampaigns(matched);
      setActiveInterstitial(null);

      // Interstitial kontrolü
      const interstitials = matched.filter((a: any) => a.type === 'interstitial');
      const now = new Date();
      const currentHour = now.getHours();

      for (const ad of interstitials) {
        // 1. Başlangıç saati kontrolü (varsayılan 07:00)
        const startHour = ad.start_hour ?? 7;
        if (currentHour < startHour) continue;

        const { data: impression } = await supabase
          .from('ad_impressions')
          .select('show_count, last_shown_at')
          .eq('ad_id', ad.id)
          .eq('user_id', userData.id)
          .eq('shown_date', today)
          .maybeSingle();

        const count = impression?.show_count ?? 0;

        // 2. Günlük limit kontrolü
        if (count >= (ad.daily_frequency || 2)) continue;

        // 3. Minimum 2 saat aralığı kontrolü
        if (impression?.last_shown_at) {
          const lastShown = new Date(impression.last_shown_at);
          const diffHours = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);
          if (diffHours < 2) continue;
        }

        setActiveInterstitial(ad);
        await supabase.from('ad_impressions').upsert(
          {
            ad_id: ad.id,
            user_id: userData.id,
            shown_date: today,
            show_count: count + 1,
            last_shown_at: now.toISOString(),
          },
          { onConflict: 'ad_id,user_id,shown_date' }
        );
        break;
      }
    } catch {
      setAdCampaigns([]);
      setActiveInterstitial(null);
    }
  }, [userData?.id, userData?.role]);

  useEffect(() => {
    if (!userData) return;
    if ((userData.role === 'tenant' || userData.role === 'landlord') && userData.status === 'pending') {
      return;
    }
    if (userData.role === 'agent' || userData.role === 'employee') {
      fetchAgentData();
    } else if (userData.role === 'landlord') {
      fetchLandlordData(userData.id);
    } else if (userData.role === 'tenant') {
      fetchTenantProperty(userData.id);
    }
    fetchTeamReportPreview();
    fetchAdCampaigns();
  }, [userData, fetchAgentData, fetchLandlordData, fetchTenantProperty, fetchTeamReportPreview, fetchAdCampaigns]);

  const onRefresh = () => {
    setRefreshing(true);
    reloadUser();
    fetchTeamReportPreview();
    fetchAdCampaigns();
  };

  // Kullanıcı verisi yoksa ve yükleme bittiyse giriş ekranına yönlendir
  useEffect(() => {
    if (!userLoading && !userData) {
      router.replace('/');
    }
  }, [userLoading, userData]);

  if (userLoading || (!userData && !userLoading)) {
    return <View style={s.loading}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  const currentUser = userData;
  if (!currentUser) {
    return <View style={s.loading}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  const role: 'agent' | 'landlord' | 'tenant' | 'employee' =
    currentUser.role === 'agent' || currentUser.role === 'landlord' || currentUser.role === 'tenant' || currentUser.role === 'employee'
      ? currentUser.role
      : 'tenant';
  const legacyBannerSub = BANNER_SUB[role] ?? BANNER_SUB.tenant;
  const bannerTitle = `Hoş Geldin ${getDisplayName(userData?.full_name, userData?.email)}`;
  const bannerSub = getTodayGreetingDate();
  const canViewReport = role === 'agent' || (role === 'employee' && hasFullEmployeeAccess(currentUser));

  if ((role === 'tenant' || role === 'landlord') && currentUser.status === 'pending') {
    return (
      <AnimatedScreen type="fade">
        <PendingApprovalScreen userData={currentUser} onReminderSent={reloadUser} />
      </AnimatedScreen>
    );
  }

  const openNotificationTarget = (type?: string, relatedId?: string | null) => {
    if (!type || !relatedId) return;
    if (isMaintenanceType(type)) {
      router.push(`/${role === 'employee' ? 'agent' : role}/maintenance?openId=${relatedId}&openType=maintenance` as any);
      return;
    }
    if (type === 'receipt') {
      if (role === 'tenant') {
        router.push(`/tenant/maintenance?focus=payments&openId=${relatedId}&openType=receipt` as any);
      } else {
        router.push(`/${role === 'employee' ? 'agent' : role}/receipts?openId=${relatedId}&openType=receipt` as any);
      }
      return;
    }
    if (type === 'task') {
      router.push(`/agent/team?tab=tasks&openTaskId=${relatedId}` as any);
      return;
    }
    if (type === 'team_message') {
      router.push('/agent/team?tab=messages' as any);
      return;
    }
    if (type === 'announcement') {
      router.push('/agent/team?tab=announcements' as any);
      return;
    }
    if (type === 'invite_reminder') {
      router.push(`/agent/pending-invite-detail?id=${relatedId}` as any);
    }
  };

  const handleContactPress = async (scheme: 'tel' | 'mailto', value?: string | null) => {
    if (!value) return;

    const url = `${scheme}:${value}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {
      // ignore contact failures
    }
  };

  return (
    <AnimatedScreen type="fade">
      <View style={s.container}>
        {/* ── BİLDİRİM PANELİ ────────────────────────────────────────────────── */}
        {notifVisible && (
          <Pressable style={s.notifOverlay} onPress={() => setNotifVisible(false)}>
            <View style={s.notifCard}>
              <Text style={s.notifTitle}>Bildirimler</Text>
              {notifications.length === 0 ? (
                <Text style={s.notifText}>{tr.settings.noNotifications}</Text>
              ) : (
                notifications.map(n => (
                  <TouchableOpacity
                    key={n.id}
                    style={[s.notifItem, !n.read && s.notifItemUnread]}
                    onPress={() => {
                      setNotifVisible(false);
                      openNotificationTarget(n.type, n.related_id);
                    }}
                  >
                    <MaterialIcons
                      name={isMaintenanceType(n.type) ? 'build' : n.type === 'task' ? 'task-alt' : n.type === 'announcement' ? 'campaign' : n.type === 'team_message' ? 'forum' : 'receipt'}
                      size={18}
                      color={theme.colors.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={s.notifItemTitle}>{n.title}</Text>
                      <Text style={s.notifItemMsg} numberOfLines={2}>{n.message}</Text>
                      <Text style={s.notifItemTime}>
                        {new Date(n.created_at).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </Pressable>
        )}

        <AnimatedHeaderScrollView
          headerHeight={56}
          headerContent={
            <>
              <View style={s.headerLeft}>
                <View style={s.logoBox}>
                  <MaterialIcons name="domain" size={24} color={theme.colors.surface} />
                </View>
                <Text style={s.headerTitle} numberOfLines={2}>{brand.fullName}</Text>
              </View>
              <View style={s.headerRightRow}>
                <TouchableOpacity style={s.headerBtn} onPress={handleOpenNotifications}>
                  <View>
                    <MaterialIcons name="notifications" size={22} color={theme.colors.copper} />
                    {unreadCount > 0 && (
                      <View style={s.notifBadge}>
                        <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </>
          }
          scrollContentStyle={s.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          {/* ── BANNER ───────────────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={s.sectionPx}>
            <View style={s.bannerCard}>
              <View style={s.bannerGreetingLayer}>
                <Text style={s.bannerTitle}>{bannerTitle}</Text>
                <Text style={s.bannerSub}>{bannerSub}</Text>
              </View>
              <MaterialIcons
                name={role === 'agent' ? 'apartment' : 'home-work'}
                size={140}
                color={theme.colors.primary}
                style={s.bannerBgIcon}
              />
            </View>
          </Animated.View>

          {/* ── AGENT: İSTATİSTİKLER ─────────────────────────────────────────── */}
          {(role === 'agent' || role === 'employee') && (
            <View style={s.sectionPx}>
              {dataLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <View style={s.miniStatsGrid}>
                  <TouchableOpacity
                    style={s.miniStatCard}
                    onPress={() => router.push('/agent/properties' as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.miniStatValue}>{agentStats.totalProperties}</Text>
                    <Text style={s.miniStatLabel}>{tr.agent.total}</Text>
                  </TouchableOpacity>
                  <View style={s.miniStatCard}>
                    <Text style={s.miniStatValue}>{agentStats.occupied}</Text>
                    <Text style={s.miniStatLabel}>{tr.agent.occupied}</Text>
                  </View>
                  <View style={s.miniStatCard}>
                    <Text style={s.miniStatValue}>{agentStats.vacant}</Text>
                    <Text style={s.miniStatLabel}>{tr.agent.vacant}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.miniStatCard}
                    onPress={() => router.push('/agent/maintenance' as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.miniStatValue}>{agentStats.pendingMaintenance}</Text>
                    <Text style={s.miniStatLabel}>{tr.agent.pending}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {(role === 'agent' || role === 'employee') && (
            <Animated.View entering={FadeInDown.delay(180).duration(500)} style={s.sectionPx}>
              <View style={s.maintenancePanelCard}>
                <View style={s.maintenancePanelHeader}>
                  <View>
                    <Text style={s.chartTitle}>Bakim komuta paneli</Text>
                    <Text style={s.maintenancePanelSub}>Ilk aksiyon, saha islemi ve kiraci onayi ayni yerde.</Text>
                  </View>
                  <TouchableOpacity style={s.maintenancePanelLink} onPress={() => router.push('/agent/maintenance' as any)}>
                    <MaterialIcons name="arrow-forward" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={s.maintenanceSummaryRow}>
                  <View style={s.maintenanceSummaryChip}>
                    <Text style={s.maintenanceSummaryValue}>{agentMaintenanceSummary.pending}</Text>
                    <Text style={s.maintenanceSummaryLabel}>Ilk aksiyon</Text>
                  </View>
                  <View style={s.maintenanceSummaryChip}>
                    <Text style={s.maintenanceSummaryValue}>{agentMaintenanceSummary.inProgress}</Text>
                    <Text style={s.maintenanceSummaryLabel}>Sahada</Text>
                  </View>
                  <View style={s.maintenanceSummaryChip}>
                    <Text style={s.maintenanceSummaryValue}>{agentMaintenanceSummary.awaitingApproval}</Text>
                    <Text style={s.maintenanceSummaryLabel}>Onay bekliyor</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {canViewReport && (
            <Animated.View entering={FadeInDown.delay(220).duration(500)} style={s.sectionPx}>
              <TouchableOpacity
                style={s.reportCard}
                activeOpacity={0.88}
                onPress={() => router.push('/agent/team?tab=report' as any)}
              >
                <View style={s.reportCardHeader}>
                  <View>
                    <Text style={s.chartTitle}>Haftalik Rapor</Text>
                    <Text style={s.maintenancePanelSub}>Ekip, portfoy ve operasyon sagligini gercek veriden izleyin.</Text>
                  </View>
                  <View style={s.maintenancePanelLink}>
                    <MaterialIcons name="arrow-forward" size={18} color={theme.colors.primary} />
                  </View>
                </View>
                <View style={s.reportMetricRow}>
                  {teamReportPreviewLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : teamReportPreview ? (
                    teamReportPreview.sections.teamPerformance.metrics.slice(0, 3).map((metric) => (
                      <View key={metric.label} style={s.reportMetricCard}>
                        <Text style={s.reportMetricValue}>{metric.value}</Text>
                        <Text style={s.reportMetricLabel}>{metric.label}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={s.emptyText}>Rapor verisi henüz hazır değil.</Text>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── LANDLORD: FİNANSAL KART ──────────────────────────────────────── */}
          {role === 'landlord' && (
            <Animated.View entering={FadeInDown.delay(150).duration(500)} style={s.sectionPx}>
              <View style={s.financialCard}>
                <Text style={s.financialLabel}>Bu Ayın Geliri</Text>
                <Text style={s.financialAmount}>{formatCurrency(monthlyRentTotal)}</Text>
                <Text style={s.financialSub}>Onaylanan kira ödemeleri</Text>
              </View>
            </Animated.View>
          )}

          {/* ── LANDLORD: İSTATİSTİK KARTLARI ────────────────────────────────── */}
          {role === 'landlord' && (
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={s.sectionPx}>
              <View style={s.statsGrid}>
                <DashboardStatCard
                  title={tr.dashboard.totalProperties}
                  value={landlordStats?.total_properties || 0}
                  iconName="business-outline"
                  iconColor={theme.colors.primary}
                  dotColor={theme.colors.primary}
                  backgroundColor={theme.colors.primaryLight}
                  textColor={theme.colors.textPrimary}
                  onPress={() => router.push('/landlord/properties' as any)}
                />
                <DashboardStatCard
                  title={tr.dashboard.occupied}
                  value={landlordStats?.occupied_properties || 0}
                  iconName="checkmark-circle-outline"
                  iconColor={theme.colors.success}
                  dotColor={theme.colors.success}
                  backgroundColor={theme.colors.successLight}
                  textColor={theme.colors.textPrimary}
                />
                <DashboardStatCard
                  title={tr.receipts.approved}
                  value={landlordStats?.approved_receipts || 0}
                  iconName="receipt-outline"
                  iconColor={theme.colors.info}
                  dotColor={theme.colors.info}
                  backgroundColor={theme.colors.infoLight}
                  textColor={theme.colors.textPrimary}
                  onPress={() => router.push('/landlord/archive' as any)}
                />
                <DashboardStatCard
                  title={tr.receipts.pending}
                  value={landlordStats?.pending_receipts || 0}
                  iconName="time-outline"
                  iconColor={theme.colors.warning}
                  dotColor={theme.colors.warning}
                  backgroundColor={theme.colors.warningLight}
                  textColor={theme.colors.textPrimary}
                  onPress={() => router.push('/landlord/receipts' as any)}
                />
                <DashboardStatCard
                  title="Kiracilar"
                  value={landlordTenantCount}
                  iconName="people-outline"
                  iconColor={theme.colors.copper}
                  dotColor={theme.colors.copper}
                  backgroundColor={theme.colors.surface}
                  textColor={theme.colors.textPrimary}
                  onPress={() => router.push('/landlord/tenants' as any)}
                />
              </View>
            </Animated.View>
          )}

          {role === 'landlord' && (
            <Animated.View entering={FadeInDown.delay(220).duration(500)} style={s.sectionPx}>
              <View style={s.maintenancePanelCard}>
                <View style={s.maintenancePanelHeader}>
                  <View>
                    <Text style={s.chartTitle}>Bakim sagligi</Text>
                    <Text style={s.maintenancePanelSub}>Mulklerinizdeki acik, kritik ve kapanan talepleri izleyin.</Text>
                  </View>
                  <TouchableOpacity style={s.maintenancePanelLink} onPress={() => router.push('/landlord/maintenance' as any)}>
                    <MaterialIcons name="arrow-forward" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={s.maintenanceSummaryRow}>
                  <View style={s.maintenanceSummaryChip}>
                    <Text style={s.maintenanceSummaryValue}>{landlordMaintenanceSummary.pending + landlordMaintenanceSummary.inProgress}</Text>
                    <Text style={s.maintenanceSummaryLabel}>Acik talep</Text>
                  </View>
                  <View style={s.maintenanceSummaryChip}>
                    <Text style={s.maintenanceSummaryValue}>{landlordMaintenanceSummary.critical}</Text>
                    <Text style={s.maintenanceSummaryLabel}>Kritik</Text>
                  </View>
                  <View style={s.maintenanceSummaryChip}>
                    <Text style={s.maintenanceSummaryValue}>{landlordMaintenanceSummary.completed}</Text>
                    <Text style={s.maintenanceSummaryLabel}>Tamamlanan</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* ── LANDLORD: AYLIK KİRA GRAFİĞİ ──────────────────────────────────── */}
          {role === 'landlord' && monthlyChartData.length > 0 && (
            <Animated.View entering={FadeInDown.delay(250).duration(500)} style={s.sectionPx}>
              <View style={s.chartCard}>
                <Text style={s.chartTitle}>Aylık Kira Geliri</Text>
                <View style={s.chartBars}>
                  {(() => {
                    const maxVal = Math.max(...monthlyChartData.map(d => d.value), 1);
                    const MAX_HEIGHT = 80;
                    return monthlyChartData.map((item, i) => (
                      <View key={i} style={s.chartBarCol}>
                        <Text style={s.chartBarValue}>
                          {item.value > 0 ? `₺${Math.round(item.value / 1000)}K` : ''}
                        </Text>
                        <View style={[s.chartBar, {
                          height: Math.max(4, Math.round((item.value / maxVal) * MAX_HEIGHT)),
                          backgroundColor: item.value > 0 ? theme.colors.primary : theme.colors.border,
                        }]} />
                        <Text style={s.chartBarLabel}>{item.label}</Text>
                      </View>
                    ));
                  })()}
                </View>
                {/* Doluluk oranı */}
                {landlordStats && landlordStats.total_properties > 0 && (
                  <View style={s.occupancyRow}>
                    <Text style={s.occupancyLabel}>Doluluk Oranı</Text>
                    <View style={s.occupancyBarBg}>
                      <View style={[s.occupancyBarFill, {
                        width: `${Math.round((landlordStats.occupied_properties / landlordStats.total_properties) * 100)}%` as any,
                      }]} />
                    </View>
                    <Text style={s.occupancyPercent}>
                      %{Math.round((landlordStats.occupied_properties / landlordStats.total_properties) * 100)}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* ── TENANT: EVİM KARTI ──────────────────────────────────────────────── */}
          {role === 'tenant' && (
            <Animated.View entering={FadeInDown.delay(150).duration(500)} style={s.sectionPx}>
              {dataLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : tenantProperty ? (
                <View style={s.tenantHomeCard}>
                  {/* Başlık */}
                  <TouchableOpacity
                    style={s.tenantHomeHeader}
                    onPress={() => router.push('/tenant/property-detail' as any)}
                    activeOpacity={0.7}
                  >
                    <View style={s.tenantHomeIconBg}>
                      <MaterialIcons name="home" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tenantHomeTitle}>{tenantProperty.address}</Text>
                      <Text style={s.tenantHomeSub}>{tenantProperty.district}, {tenantProperty.city}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Finans Satırı */}
                  <View style={s.tenantFinRow}>
                    <View style={s.tenantFinItem}>
                      <Text style={s.tenantFinLabel}>KİRA</Text>
                      <Text style={s.tenantFinValue}>{formatCurrency(tenantProperty.monthly_rent)}</Text>
                    </View>
                    <View style={s.tenantFinDivider} />
                    <View style={s.tenantFinItem}>
                      <Text style={s.tenantFinLabel}>AİDAT</Text>
                      <Text style={s.tenantFinValue}>{formatCurrency(tenantProperty.dues_amount)}</Text>
                    </View>
                    <View style={s.tenantFinDivider} />
                    <View style={s.tenantFinItem}>
                      <Text style={s.tenantFinLabel}>DEPOZİTO</Text>
                      <Text style={s.tenantFinValue}>{formatCurrency(tenantProperty.deposit_amount)}</Text>
                    </View>
                  </View>

                  {/* Kira Geri Sayım Barı */}
                  {tenantProperty.rent_day && (() => {
                    const today = new Date();
                    const todayDate = today.getDate();
                    const rentDay = tenantProperty.rent_day;

                    let nextPayment: Date;
                    if (todayDate < rentDay) {
                      nextPayment = new Date(today.getFullYear(), today.getMonth(), rentDay);
                    } else {
                      nextPayment = new Date(today.getFullYear(), today.getMonth() + 1, rentDay);
                    }

                    const daysRemaining = Math.max(0, Math.ceil(
                      (nextPayment.getTime() - today.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)
                    ));

                    const countdownColor = daysRemaining <= 2
                      ? theme.colors.error
                      : daysRemaining <= 7
                      ? theme.colors.warning
                      : theme.colors.success;

                    const progress = Math.max(0, Math.min(1, 1 - daysRemaining / 30));

                    return (
                      <View style={s.rentCountdownCard}>
                        <View style={s.rentCountdownRow}>
                          <View style={[s.rentCountdownDot, { backgroundColor: countdownColor }]} />
                          <Text style={s.rentCountdownLabel}>{tr.tenant.nextRentCountdown}</Text>
                          <Text style={[s.rentCountdownDays, { color: countdownColor }]}>
                            {daysRemaining} gün kaldı
                          </Text>
                        </View>
                        <View style={s.rentProgressBg}>
                          <View style={[s.rentProgressFill, {
                            width: `${Math.round(progress * 100)}%` as any,
                            backgroundColor: countdownColor,
                          }]} />
                        </View>
                        <Text style={s.rentDueDate}>
                          Vade: {nextPayment.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                        </Text>
                      </View>
                    );
                  })()}

                  {/* Sözleşme Progress */}
                  {tenantProperty.contract_start && tenantProperty.contract_end && (() => {
                    const start = new Date(tenantProperty.contract_start).getTime();
                    const end = new Date(tenantProperty.contract_end).getTime();
                    const now = Date.now();
                    const progress = Math.min(Math.max((now - start) / (end - start), 0), 1);
                    const remainDays = Math.max(0, Math.round((end - now) / (1000 * 60 * 60 * 24)));
                    return (
                      <View style={s.contractSection}>
                        <View style={s.contractHeaderRow}>
                          <Text style={s.contractLabel}>SÖZLEŞME</Text>
                          <Text style={s.contractRemain}>{remainDays} gün kaldı</Text>
                        </View>
                        <View style={s.progressBarBg}>
                          <View style={[s.progressBarFill, { width: `${Math.round(progress * 100)}%` as any }]} />
                        </View>
                        <View style={s.contractDates}>
                          <Text style={s.contractDateText}>{new Date(tenantProperty.contract_start).toLocaleDateString('tr-TR')}</Text>
                          <Text style={s.contractDateText}>{new Date(tenantProperty.contract_end).toLocaleDateString('tr-TR')}</Text>
                        </View>
                      </View>
                    );
                  })()}

                  {tenantSupportContacts.length > 0 && (
                    <View style={s.supportCard}>
                      <View style={s.maintenancePanelHeader}>
                        <View>
                          <Text style={s.chartTitle}>Destek iletisimi</Text>
                          <Text style={s.maintenancePanelSub}>Ev sahibi ve ofis sorumlularina hizli erisin.</Text>
                        </View>
                      </View>
                      {tenantSupportContacts.map((contact) => (
                        <View key={contact.id} style={s.supportRow}>
                          <View style={[s.supportAvatar, { backgroundColor: contact.role === 'agent' ? theme.colors.primaryLight : theme.colors.warningLight }]}>
                            <MaterialIcons
                              name={contact.role === 'agent' ? 'apartment' : 'home'}
                              size={18}
                              color={contact.role === 'agent' ? theme.colors.primary : theme.colors.warningText}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.supportName}>{contact.full_name || 'Kullanici'}</Text>
                            <Text style={s.supportRole}>{contact.role === 'agent' ? 'Ofis sorumlusu' : 'Ev sahibi'}</Text>
                          </View>
                          <View style={s.supportActions}>
                            {contact.phone ? (
                              <TouchableOpacity style={s.supportActionBtn} onPress={() => void handleContactPress('tel', contact.phone)}>
                                <MaterialIcons name="call" size={18} color={theme.colors.successText} />
                              </TouchableOpacity>
                            ) : null}
                            {contact.email ? (
                              <TouchableOpacity style={s.supportActionBtn} onPress={() => void handleContactPress('mailto', contact.email)}>
                                <MaterialIcons name="mail" size={18} color={theme.colors.primary} />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={s.tenantMaintenanceCard}>
                    <View style={s.maintenancePanelHeader}>
                      <View>
                        <Text style={s.chartTitle}>Ariza durumu</Text>
                        <Text style={s.maintenancePanelSub}>
                          {tenantMaintenanceSummary.awaitingApproval > 0
                            ? 'Tamamlanan bir is icin geri bildiriminiz bekleniyor.'
                            : 'Acik ve devam eden taleplerinizin son durumu.'}
                        </Text>
                      </View>
                      <TouchableOpacity style={s.maintenancePanelLink} onPress={() => router.push('/tenant/maintenance' as any)}>
                        <MaterialIcons name="arrow-forward" size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.maintenanceSummaryRow}>
                      <View style={s.maintenanceSummaryChip}>
                        <Text style={s.maintenanceSummaryValue}>{tenantMaintenanceSummary.pending + tenantMaintenanceSummary.inProgress}</Text>
                        <Text style={s.maintenanceSummaryLabel}>Acik is</Text>
                      </View>
                      <View style={s.maintenanceSummaryChip}>
                        <Text style={s.maintenanceSummaryValue}>{tenantMaintenanceSummary.awaitingApproval}</Text>
                        <Text style={s.maintenanceSummaryLabel}>Onay bekliyor</Text>
                      </View>
                      <View style={s.maintenanceSummaryChip}>
                        <Text style={s.maintenanceSummaryValue}>{tenantMaintenanceSummary.completed}</Text>
                        <Text style={s.maintenanceSummaryLabel}>Tamamlanan</Text>
                      </View>
                    </View>
                    {tenantMaintenanceSummary.latest[0] && (() => {
                      const latestItem = tenantMaintenanceSummary.latest[0];
                      const awaitingApproval =
                        latestItem.status === 'completed' && !latestItem.tenant_approved_at;
                      const statusMeta = getMaintenanceStatusMeta(latestItem.status, { awaitingTenantApproval: awaitingApproval });
                      const statusTone = getMaintenanceStatusTone(theme, latestItem.status, { awaitingTenantApproval: awaitingApproval });
                      return (
                        <TouchableOpacity
                          style={s.tenantMaintenanceLatest}
                          activeOpacity={0.8}
                          onPress={() => router.push(`/tenant/maintenance?openId=${latestItem.id}&openType=maintenance` as any)}
                        >
                          <View style={[s.activityIcon, { backgroundColor: statusTone.backgroundColor, width: 36, height: 36, borderRadius: 12, marginRight: 0 }]}>
                            <MaterialIcons name={statusMeta.icon as any} size={16} color={statusTone.accentColor} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.activityTitle}>{latestItem.title || 'Bakim kaydi'}</Text>
                            <Text style={s.activityMsg}>{getMaintenanceNextAction(latestItem, 'tenant')}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>

                </View>
              ) : (
                <View style={s.tenantNoHome}>
                  <MaterialIcons name="home" size={48} color={theme.colors.textMuted} />
                  <Text style={s.tenantNoHomeText}>{tr.tenant.noActiveProperty}</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* ── TAKVİM WİDGET (tüm roller) ───────────────────────────────────── */}
          {userData && (
            <Animated.View entering={FadeInDown.delay(role === 'landlord' ? 300 : 200).duration(500)}>
              <CalendarWidget role={role as 'agent' | 'landlord' | 'tenant'} userId={userData.id} />
            </Animated.View>
          )}

          {/* ── AGENT: SON AKTİVİTELER ───────────────────────────────────────── */}
          {(role === 'agent' || role === 'employee') && (
            <View style={s.sectionPx}>
              <Text style={s.sectionTitle}>{tr.agent.recentActivity}</Text>
              <View style={s.activityStack}>
                {recentActivities.length > 0 ? recentActivities.map((act, i) => (
                  <Animated.View
                    key={act.id}
                    entering={FadeInRight.delay(i * 100).duration(500)}
                    style={s.activityCard}
                  >
                    <View style={[s.activityIcon, { backgroundColor: isMaintenanceType(act.type) ? theme.colors.warningLight : theme.colors.infoLight }]}>
                      <MaterialIcons
                        name={isMaintenanceType(act.type) ? 'build' : 'receipt'}
                        size={18}
                        color={isMaintenanceType(act.type) ? theme.colors.warningText : theme.colors.infoText}
                      />
                    </View>
                    <View style={s.activityInfo}>
                      <Text style={s.activityTitle}>{act.title}</Text>
                      <Text style={s.activityMsg} numberOfLines={1}>{act.message}</Text>
                    </View>
                    <Text style={s.activityTime}>{new Date(act.created_at).toLocaleDateString('tr-TR')}</Text>
                  </Animated.View>
                )) : (
                  <Text style={s.emptyText}>{tr.agent.noActivity}</Text>
                )}
              </View>
            </View>
          )}

          {/* ── PAZARLAMA BÖLÜMLERİ (tüm roller) ────────────────────────────── */}
          <DashboardMarketingSection campaigns={adCampaigns} />
        </AnimatedHeaderScrollView>
      </View>

      {/* ── Interstitial Reklam Modal ──────────────────────────────────────── */}
      <InterstitialAdModal
        visible={!!activeInterstitial}
        ad={activeInterstitial}
        onClose={() => setActiveInterstitial(null)}
      />
    </AnimatedScreen>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },

  // Header
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { backgroundColor: theme.colors.primary, padding: 6, borderRadius: 8 },
  headerTitle: { flexShrink: 1, fontSize: 16, lineHeight: 19, fontWeight: '700', color: theme.colors.textPrimary },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center', ...theme.shadows.sm },

  // Bildirim paneli
  notifOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  notifCard: { position: 'absolute', top: 90, right: 16, left: 16, backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm, maxHeight: 380 },
  notifTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  notifText: { fontSize: 14, color: theme.colors.textMuted },
  notifItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  notifItemUnread: { backgroundColor: theme.colors.primaryLight, marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 8 },
  notifItemTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  notifItemMsg: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  notifItemTime: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  notifBadge: { position: 'absolute', top: -5, right: -6, backgroundColor: theme.colors.error, borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  notifBadgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.white },

  // Scroll
  scrollContent: { paddingBottom: 60 },
  sectionPx: { paddingHorizontal: 16, marginTop: 12, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },

  // Banner
  bannerCard: { backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 16, padding: 24, overflow: 'hidden', position: 'relative' },
  bannerGreetingLayer: { position: 'absolute', top: 24, left: 24, right: 24, zIndex: 10 },
  bannerTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  bannerSub: { fontSize: 14, color: theme.colors.textMuted, maxWidth: '70%' },
  bannerBgIcon: { position: 'absolute', right: -20, bottom: -40, opacity: 0.05 },

  // Agent mini istatistik kartları
  miniStatsGrid: { flexDirection: 'row', gap: 12, marginTop: 16 },
  miniStatCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
  miniStatValue: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  miniStatLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2, textTransform: 'uppercase' },

  // Landlord finansal kart
  financialCard: { backgroundColor: theme.colors.dark, borderRadius: 16, padding: 20 },
  financialLabel: { fontSize: 13, color: theme.colors.white, opacity: 0.6, fontWeight: '500' },
  financialAmount: { fontSize: 32, color: theme.colors.primary, fontWeight: '700', marginVertical: 4 },
  financialSub: { fontSize: 12, color: theme.colors.white, opacity: 0.5 },

  // Landlord stat grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  maintenancePanelCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  maintenancePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  maintenancePanelSub: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18, marginTop: 4, maxWidth: 240 },
  maintenancePanelLink: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  maintenanceSummaryRow: { flexDirection: 'row', gap: 10 },
  maintenanceSummaryChip: {
    flex: 1,
    backgroundColor: theme.colors.surface2,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  maintenanceSummaryValue: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  maintenanceSummaryLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, marginTop: 4, textTransform: 'uppercase' },
  reportCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  reportMetricRow: { flexDirection: 'row', gap: 10 },
  reportMetricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reportMetricValue: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  reportMetricLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 6, lineHeight: 14 },

  // Agent aktivite listesi
  activityStack: { marginTop: 12, gap: 10 },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.primaryLight, ...theme.shadows.sm },
  activityIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
  activityMsg: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  activityTime: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '500' },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', fontStyle: 'italic', marginTop: 8 },

  // Tenant Evim kartı
  tenantHomeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  tenantHomeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  tenantHomeIconBg: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  tenantHomeTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  tenantHomeSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  tenantFinRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface2, borderRadius: 12, padding: 12, marginBottom: 16 },
  tenantFinItem: { flex: 1, alignItems: 'center' },
  tenantFinDivider: { width: 1, height: 28, backgroundColor: theme.colors.border },
  tenantFinLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  tenantFinValue: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },

  // Kira geri sayım barı
  rentCountdownCard: {
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.surface2,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rentCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rentCountdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rentCountdownLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  rentCountdownDays: {
    fontSize: 13,
    fontWeight: '700',
  },
  rentProgressBg: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  rentProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  rentDueDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  contractSection: { marginBottom: 16 },
  contractHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  contractLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase' },
  contractRemain: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  progressBarBg: { height: 8, borderRadius: 4, backgroundColor: theme.colors.surface2, overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  contractDates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  contractDateText: { fontSize: 11, color: theme.colors.textMuted },
  supportCard: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface2,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportName: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  supportRole: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  supportActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  supportActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantMaintenanceCard: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface2,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tenantMaintenanceLatest: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tenantNoHome: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  tenantNoHomeText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' },

  // Landlord grafik
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  chartTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 16 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, marginBottom: 16 },
  chartBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  chartBarValue: { fontSize: 9, color: theme.colors.textMuted, fontWeight: '600' },
  chartBar: { width: '60%', borderRadius: 4, minHeight: 4 },
  chartBarLabel: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' },
  occupancyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  occupancyLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600', width: 80 },
  occupancyBarBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.colors.surface2, overflow: 'hidden' },
  occupancyBarFill: { height: 6, borderRadius: 3, backgroundColor: theme.colors.success },
  occupancyPercent: { fontSize: 12, fontWeight: '700', color: theme.colors.successText, width: 36, textAlign: 'right' },
}));
