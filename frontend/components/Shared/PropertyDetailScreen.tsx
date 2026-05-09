import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Share, Alert, FlatList, Dimensions,
  Modal, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { tr } from '../../app/translations';
import { supabase } from '../../services/supabase';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { getPropertyImage, formatCurrency } from '../../utils/propertyHelpers';
import { useUserData } from '../../hooks/useUserData';
import CalendarWidget from './CalendarWidget';
import AnimatedHeaderScrollView from './AnimatedHeaderScrollView';
import { DocumentVault } from './DocumentVault';
import AnimatedScreen from './AnimatedScreen';
import { canManageOfficeRecords } from '../../utils/employeeAccess';
import { AMENITY_CONFIG } from '../../constants/amenities';
import {
  formatMaintenanceDate,
  getMaintenanceNextAction,
  getMaintenanceStatusMeta,
  getMaintenanceStatusTone,
} from '../../utils/maintenancePresentation';

const SCREEN_WIDTH = Dimensions.get('window').width;

const AMENITY_ICONS: Record<string, string> = {
  wifi: 'wifi', parking: 'local-parking', pool: 'pool',
  gym: 'fitness-center', elevator: 'elevator', balcony: 'balcony',
  security: 'security', generator: 'bolt',
};
const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi', parking: 'Otopark', pool: 'Havuz',
  gym: 'Spor Salonu', elevator: 'Asansör', balcony: 'Balkon',
  security: 'Güvenlik', generator: 'Jeneratör',
};

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  occupied: { label: 'Kirada', bg: 'rgba(30,111,217,0.12)', text: '#1E6FD9' },
  vacant: { label: 'Boş', bg: 'rgba(26,158,92,0.12)', text: '#1A9E5C' },
  maintenance: { label: 'Bakımda', bg: 'rgba(196,122,0,0.12)', text: '#C47A00' },
};

const TYPE_LABEL: Record<string, string> = {
  apartment: 'Daire', house: 'Müstakil', office: 'Ofis', land: 'Arsa',
};
const HEATING_LABEL: Record<string, string> = {
  kombi: 'Kombi', merkezi: 'Merkezi', yerden: 'Yerden ısıtma', klima: 'Klima', yok: 'Isıtma yok',
};

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHead({ icon, title, actionIcon, onAction }: {
  icon: string; title: string; actionIcon?: string; onAction?: () => void;
}) {
  const s = useStyles();
  const theme = useAppTheme();
  return (
    <View style={s.sectionHead}>
      <View style={s.sectionIconWrap}>
        <MaterialIcons name={icon as any} size={16} color={theme.colors.primary} />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
      {actionIcon && onAction && (
        <TouchableOpacity style={s.sectionAction} onPress={onAction}>
          <MaterialIcons name={actionIcon as any} size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  const s = useStyles();
  const theme = useAppTheme();
  return (
    <View style={[s.infoRow, last && s.infoRowLast]}>
      <View style={s.infoRowIcon}>
        <MaterialIcons name={icon as any} size={16} color={theme.colors.textMuted} />
      </View>
      <Text style={s.infoRowLabel}>{label}</Text>
      <Text style={s.infoRowValue}>{value}</Text>
    </View>
  );
}

export default function PropertyDetailScreen() {
  const theme = useAppTheme();
  const s = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userData, loading: userLoading } = useUserData();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [emptyState, setEmptyState] = useState<'tenant-unassigned' | null>(null);
  const [property, setProperty] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [landlord, setLandlord] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [activities, setActivities] = useState<{ id: string; title: string; type: 'receipt' | 'maintenance'; date: string }[]>([]);
  const [maintenanceOverview, setMaintenanceOverview] = useState<{
    open: number; pending: number; inProgress: number; completed: number; critical: number; latest: any[];
  }>({ open: 0, pending: 0, inProgress: 0, completed: 0, critical: 0, latest: [] });
  const [contactModal, setContactModal] = useState<{
    full_name: string; email?: string; phone?: string;
    roleLabel: string; iconName: string; iconColor: string; bgColor: string;
  } | null>(null);
  const [removingTenant, setRemovingTenant] = useState(false);

  const userRole = userData?.role || 'tenant';
  const canEditProperty = canManageOfficeRecords(userData);

  const displayName = (user: { full_name?: string; email?: string } | null) => {
    if (!user) return '—';
    if (user.full_name?.trim()) return user.full_name;
    if (user.email) return user.email.split('@')[0];
    return '—';
  };

  const loadPropertyData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setEmptyState(null);
    setProperty(null);
    try {
      let resolvedId = id;
      if (!resolvedId && userRole === 'tenant' && userData?.id) {
        const { data: tenantProp } = await supabase
          .from('properties').select('id').eq('tenant_id', userData.id).maybeSingle();
        if (tenantProp?.id) resolvedId = tenantProp.id;
        else {
          setEmptyState('tenant-unassigned');
          setLoading(false);
          return;
        }
      }
      if (!resolvedId) {
        setLoadError(tr.errors.loadFailed);
        setLoading(false);
        return;
      }

      const { data: prop, error } = await supabase.from('properties').select('*').eq('id', resolvedId).single();
      if (error || !prop) throw error;
      setProperty(prop);

      if (prop.landlord_id) {
        const { data: ll } = await supabase.from('users').select('full_name, email, phone').eq('id', prop.landlord_id).single();
        setLandlord(ll);
      }
      if (prop.tenant_id) {
        const { data: tn } = await supabase.from('users').select('full_name, email, phone').eq('id', prop.tenant_id).single();
        setTenant(tn);
      }
      if (prop.agent_id) {
        const { data: ag } = await supabase.from('users').select('full_name, email, phone').eq('id', prop.agent_id).single();
        if (ag) setAgent(ag);
      }
      if (prop.employee_id) {
        const { data: emp } = await supabase.from('users').select('full_name, email, phone').eq('id', prop.employee_id).single();
        if (emp) setEmployee(emp);
      }

      if (prop.id) {
        const [receiptRes, maintRes] = await Promise.all([
          supabase.from('receipts').select('id, receipt_type, created_at, amount').eq('property_id', prop.id).eq('status', 'approved').order('created_at', { ascending: false }).limit(5),
          supabase.from('maintenance_requests').select('id, title, created_at').eq('property_id', prop.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(5),
        ]);

        const merged = [
          ...(receiptRes.data || []).map((r: any) => ({ id: r.id, title: r.receipt_type === 'rent' ? 'Kira Alındı' : r.receipt_type === 'dues' ? 'Aidat Alındı' : 'Ödeme Alındı', type: 'receipt' as const, date: r.created_at })),
          ...(maintRes.data || []).map((r: any) => ({ id: r.id, title: r.title || 'Bakım Tamamlandı', type: 'maintenance' as const, date: r.created_at })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
        setActivities(merged);

        const { data: maintenanceRows } = await supabase
          .from('maintenance_requests').select('id, title, status, priority, updated_at, created_at, tenant_approved_at')
          .eq('property_id', prop.id).order('updated_at', { ascending: false });

        const rows = maintenanceRows || [];
        setMaintenanceOverview({
          open: rows.filter((i: any) => ['pending', 'in_progress'].includes(i.status)).length,
          pending: rows.filter((i: any) => i.status === 'pending').length,
          inProgress: rows.filter((i: any) => i.status === 'in_progress').length,
          completed: rows.filter((i: any) => i.status === 'completed').length,
          critical: rows.filter((i: any) => i.priority === 'high').length,
          latest: rows.slice(0, 3),
        });
      }
    } catch (err) {
      console.error('Error loading property detail:', err);
      setLoadError(err instanceof Error ? err.message : tr.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [id, userRole, userData]);

  useFocusEffect(useCallback(() => {
    if (!userLoading) loadPropertyData();
  }, [userLoading, loadPropertyData]));

  const handleEdit = () => { if (property?.id) router.push(`/agent/edit-property?id=${property.id}` as any); };

  const handleShare = async () => {
    try {
      await Share.share({ message: `${property?.description || property?.address} - ${formatCurrency(property?.monthly_rent)} / ay` });
    } catch { }
  };

  const handleDelete = async () => {
    Alert.alert(tr.properties.deleteProperty, tr.properties.deletePropertyConfirm, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.common.delete, style: 'destructive',
        onPress: async () => {
          if (!property?.id) return;
          try {
            await supabase.from('calendar_events').delete().eq('property_id', property.id);
            await supabase.from('receipts').delete().eq('property_id', property.id);
            await supabase.from('maintenance_requests').delete().eq('property_id', property.id);
            await supabase.from('properties').delete().eq('id', property.id);
            Alert.alert(tr.common.success, tr.properties.deletePropertySuccess, [{ text: tr.common.ok, onPress: () => router.back() }]);
          } catch { Alert.alert(tr.common.error, tr.errors.saveFailed); }
        },
      },
    ]);
  };

  const handleRemoveTenant = () => {
    if (!property?.id || !property?.tenant_id) return;
    Alert.alert(tr.properties.removeTenantTitle, tr.properties.removeTenantConfirm, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.properties.removeTenantAction, style: 'destructive',
        onPress: async () => {
          try {
            setRemovingTenant(true);
            const { error } = await supabase.from('properties').update({
              tenant_id: null, status: 'vacant',
              contract_start: null, contract_end: null, contract_duration: null,
              deposit_amount: null, deposit_currency: 'TRY',
            }).eq('id', property.id);
            if (error) { Alert.alert(tr.common.error, tr.errors.saveFailed + ': ' + error.message); return; }
            setTenant(null);
            setProperty((prev: any) => prev ? { ...prev, tenant_id: null, status: 'vacant', contract_start: null, contract_end: null, contract_duration: null, deposit_amount: null, deposit_currency: 'TRY' } : prev);
            Alert.alert(tr.common.success, tr.properties.tenantRemovedSuccess, [{ text: tr.common.ok, onPress: () => loadPropertyData() }]);
          } catch { Alert.alert(tr.common.error, tr.errors.saveFailed); }
          finally { setRemovingTenant(false); }
        },
      },
    ]);
  };

  if (loading || userLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!property) {
    const isTenantEmpty = emptyState === 'tenant-unassigned';
    return (
      <View style={s.center}>
        <View style={s.stateCard}>
          <MaterialIcons
            name={isTenantEmpty ? 'home-work' : 'cloud-off'}
            size={44}
            color={isTenantEmpty ? theme.colors.primary : theme.colors.error}
          />
          <Text style={s.stateTitle}>
            {isTenantEmpty ? 'Mülk ataması bekleniyor' : 'Mülk yüklenemedi'}
          </Text>
          <Text style={s.stateText}>
            {isTenantEmpty
              ? 'Ofisiniz size bir mülk atadığında Evim sekmesi burada dolacak.'
              : loadError || 'Bağlantı veya yetki sebebiyle mülk bilgisi alınamadı.'}
          </Text>
          <View style={s.stateActions}>
            <TouchableOpacity style={s.statePrimaryBtn} onPress={loadPropertyData} activeOpacity={0.85}>
              <MaterialIcons name="refresh" size={18} color={theme.colors.textInverse} />
              <Text style={s.statePrimaryText}>Tekrar Dene</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.stateSecondaryBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Text style={s.stateSecondaryText}>{tr.common.back}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const statusMeta = STATUS_META[property.status] ?? STATUS_META.vacant;
  const heroImage = getPropertyImage(parseInt(property.id.replace(/\D/g, '').slice(0, 6) || '0', 10));
  const isTenant = userRole === 'tenant';
  const hasImages = property.images?.length > 0;
  const images = hasImages ? property.images : [heroImage];

  const activeAmenities = property.amenities
    ? Object.entries(property.amenities as Record<string, boolean>).filter(([, v]) => v === true)
    : [];

  // Parse room type from description (format: "3+1 | Açıklama")
  const roomType = property.description?.match(/\d+\+\d+|Stüdyo/)?.[0] || null;
  return (
    <AnimatedScreen type="fade">
      <View style={s.container}>
        <AnimatedHeaderScrollView
          transparentHeader
          headerHeight={56}
          headerContent={
            <>
              <TouchableOpacity onPress={() => router.back()} style={s.floatBtn}>
                <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <View style={s.headerActions}>
                <TouchableOpacity onPress={handleShare} style={s.floatBtn}>
                  <MaterialIcons name="share" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                {canEditProperty && (
                  <TouchableOpacity onPress={handleEdit} style={s.floatBtn}>
                    <MaterialIcons name="edit" size={20} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                )}
                {canEditProperty && (
                  <TouchableOpacity onPress={handleDelete} style={[s.floatBtn, { borderColor: `${theme.colors.error}40` }]}>
                    <MaterialIcons name="delete" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          }
          scrollContentStyle={s.scrollContent}
        >
          {/* ── CAROUSEL ── */}
          <View style={s.heroWrap}>
            <FlatList
              horizontal pagingEnabled
              data={images}
              keyExtractor={(_: any, i: number) => String(i)}
              renderItem={({ item }: { item: string }) => (
                <Image source={{ uri: item }} style={[s.heroImage, { width: SCREEN_WIDTH }]} resizeMode="cover" />
              )}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => setCarouselIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={s.heroGradient} />

            {/* Status badge on hero */}
            <View style={[s.heroBadge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[s.heroBadgeText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
            </View>

            {/* Carousel dots */}
            {images.length > 1 && (
              <View style={s.dotsRow}>
                {images.map((_: any, i: number) => (
                  <View key={i} style={[s.dot, i === carouselIndex && s.dotActive]} />
                ))}
              </View>
            )}

            {/* Hero footer */}
            <View style={s.heroFooter}>
              <Text style={s.heroTitle} numberOfLines={1}>
                {property.description?.replace(/^[\w+]+\s*\|\s*/, '') || property.address}
              </Text>
              <View style={s.heroLocationRow}>
                <MaterialIcons name="location-on" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={s.heroLocation}>
                  {[property.address, property.district, property.city].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>
          </View>

          {/* ── FIYAT BANDI ── */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.priceBand}>
            <View style={s.priceBandItem}>
              <Text style={s.priceBandValue}>{formatCurrency(property.monthly_rent)}</Text>
              <Text style={s.priceBandLabel}>Aylık Kira</Text>
            </View>
            <View style={s.priceBandDivider} />
            <View style={s.priceBandItem}>
              <Text style={s.priceBandValue}>{property.deposit_amount ? formatCurrency(property.deposit_amount) : '—'}</Text>
              <Text style={s.priceBandLabel}>Depozito</Text>
            </View>
            <View style={s.priceBandDivider} />
            <View style={s.priceBandItem}>
              <Text style={s.priceBandValue}>{property.area ? `${property.area} m²` : '—'}</Text>
              <Text style={s.priceBandLabel}>Metrekare</Text>
            </View>
          </Animated.View>

          <View style={s.content}>
            {/* ── MÜLK BİLGİLERİ ── */}
            <Animated.View entering={FadeInDown.delay(150).duration(400)} style={s.card}>
              <SectionHead icon="info-outline" title="Mülk Bilgileri" />
              <InfoRow icon="apartment" label="Tür" value={TYPE_LABEL[property.property_type] || property.property_type || '—'} />
              {roomType && <InfoRow icon="king-bed" label="Oda Tipi" value={roomType} />}
              <InfoRow icon="local-fire-department" label="Isınma" value={HEATING_LABEL[property.heating] || property.heating || '—'} />
              <InfoRow icon="chair" label="Eşya" value={property.is_furnished ? 'Mobilyalı' : 'Mobilyasız'} />
              <InfoRow icon="calendar-today" label="Kira Günü" value={property.rent_day ? `Her ayın ${property.rent_day}.` : '—'} />
              <InfoRow icon="receipt-long" label="Aidat" value={property.dues_amount ? `${formatCurrency(property.dues_amount)}${property.dues_day ? ` (${property.dues_day}.)` : ''}` : '—'} last />
            </Animated.View>

            {/* ── OLANAKLAR ── */}
            {activeAmenities.length > 0 && (
              <Animated.View entering={FadeInDown.delay(180).duration(400)} style={s.card}>
                <SectionHead icon="check-circle-outline" title="Olanaklar" />
                <View style={s.amenityChipRow}>
                  {activeAmenities.map(([key]) => (
                    <View key={key} style={s.amenityChip}>
                      <MaterialIcons
                        name={(AMENITY_CONFIG[key as keyof typeof AMENITY_CONFIG]?.icon ?? AMENITY_ICONS[key] ?? 'check') as any}
                        size={14}
                        color={theme.colors.primary}
                      />
                      <Text style={s.amenityChipText}>
                        {AMENITY_CONFIG[key as keyof typeof AMENITY_CONFIG]?.label ?? AMENITY_LABELS[key] ?? key}
                      </Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ── KİŞİLER ── */}
            <Animated.View entering={FadeInDown.delay(210).duration(400)} style={s.card}>
              <SectionHead icon="people" title="Taraflar" />

              {landlord && (
                <TouchableOpacity
                  style={s.personCard}
                  activeOpacity={0.85}
                  onPress={() => setContactModal({ full_name: displayName(landlord), email: landlord.email, phone: landlord.phone, roleLabel: tr.agent.owner, iconName: 'home', iconColor: theme.colors.warning, bgColor: theme.colors.warningLight })}
                >
                  <View style={[s.personAvatar, { backgroundColor: theme.colors.warningLight }]}>
                    <MaterialIcons name="home" size={22} color={theme.colors.warning} />
                  </View>
                  <View style={s.personInfo}>
                    <Text style={s.personRole}>{tr.agent.owner.toUpperCase()}</Text>
                    <Text style={s.personName}>{displayName(landlord)}</Text>
                  </View>
                  <View style={s.personCallBtn}>
                    <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>
              )}

              {tenant ? (
                <TouchableOpacity
                  style={s.personCard}
                  activeOpacity={0.85}
                  onPress={() => setContactModal({ full_name: displayName(tenant), email: tenant.email, phone: tenant.phone, roleLabel: tr.agent.tenant, iconName: 'person', iconColor: theme.colors.primary, bgColor: theme.colors.primaryLight })}
                >
                  <View style={[s.personAvatar, { backgroundColor: theme.colors.primaryLight }]}>
                    <MaterialIcons name="person" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={s.personInfo}>
                    <Text style={s.personRole}>{tr.agent.tenant.toUpperCase()}</Text>
                    <Text style={s.personName}>{displayName(tenant)}</Text>
                  </View>
                  <View style={s.personCallBtn}>
                    <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ) : canEditProperty ? (
                <TouchableOpacity
                  style={[s.personCard, s.personCardDashed]}
                  onPress={() => router.push(`/agent/invite?role=tenant&propertyId=${property.id}` as any)}
                >
                  <View style={[s.personAvatar, { backgroundColor: theme.colors.primary }]}>
                    <MaterialIcons name="person-add" size={20} color="#fff" />
                  </View>
                  <Text style={[s.personName, { color: theme.colors.primary }]}>Kiracı Davet Et</Text>
                </TouchableOpacity>
              ) : null}

              {agent && (
                <TouchableOpacity
                  style={s.personCard}
                  activeOpacity={0.85}
                  onPress={() => setContactModal({ full_name: displayName(agent), email: agent.email, phone: agent.phone, roleLabel: 'Emlakçı', iconName: 'business', iconColor: theme.colors.copper, bgColor: theme.colors.copperLight })}
                >
                  <View style={[s.personAvatar, { backgroundColor: theme.colors.copperLight }]}>
                    <MaterialIcons name="business" size={22} color={theme.colors.copper} />
                  </View>
                  <View style={s.personInfo}>
                    <Text style={s.personRole}>EMLAKÇI</Text>
                    <Text style={s.personName}>{displayName(agent)}</Text>
                  </View>
                  <View style={s.personCallBtn}>
                    <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>
              )}

              {employee && (
                <TouchableOpacity
                  style={s.personCard}
                  activeOpacity={0.85}
                  onPress={() => setContactModal({ full_name: displayName(employee), email: employee.email, phone: employee.phone, roleLabel: 'Sorumlu Çalışan', iconName: 'badge', iconColor: theme.colors.success, bgColor: theme.colors.successLight })}
                >
                  <View style={[s.personAvatar, { backgroundColor: theme.colors.successLight }]}>
                    <MaterialIcons name="badge" size={22} color={theme.colors.success} />
                  </View>
                  <View style={s.personInfo}>
                    <Text style={s.personRole}>SORUMLU ÇALIŞAN</Text>
                    <Text style={s.personName}>{displayName(employee)}</Text>
                  </View>
                  <View style={s.personCallBtn}>
                    <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* ── SÖZLEŞME ── */}
            {(isTenant || (!isTenant && property.tenant_id && (property.contract_start || property.contract_duration))) && (
              <Animated.View entering={FadeInDown.delay(230).duration(400)} style={s.card}>
                <SectionHead icon="description" title="Sözleşme & Ödeme" />
                <InfoRow icon="vpn-key" label="Kira Günü" value={property.rent_day ? `Her ayın ${property.rent_day}. günü` : '—'} />
                <InfoRow icon="receipt-long" label="Aidat Günü" value={property.dues_day ? `Her ayın ${property.dues_day}. günü` : '—'} />
                <InfoRow icon="event" label="Başlangıç" value={property.contract_start ? new Date(property.contract_start).toLocaleDateString('tr-TR') : '—'} />
                <InfoRow icon="event-available" label="Bitiş" value={property.contract_end ? new Date(property.contract_end).toLocaleDateString('tr-TR') : '—'} />
                <InfoRow icon="schedule" label="Süre" value={property.contract_duration ? `${property.contract_duration} Ay` : '—'} last />
              </Animated.View>
            )}

            {/* ── BAKIM MERKEZİ ── */}
            <Animated.View entering={FadeInDown.delay(260).duration(400)} style={s.card}>
              <SectionHead
                icon="build"
                title={isTenant ? 'Açık İşler' : canEditProperty ? 'Bakım Merkezi' : 'Bakım Sağlığı'}
                actionIcon="north-east"
                onAction={() => router.push(`/${userRole === 'employee' ? 'agent' : userRole}/maintenance` as any)}
              />

              <View style={s.maintStatRow}>
                {[
                  { label: 'Açık', value: maintenanceOverview.open, color: theme.colors.warning },
                  { label: 'Kritik', value: maintenanceOverview.critical, color: theme.colors.error },
                  { label: 'Tamamlanan', value: maintenanceOverview.completed, color: theme.colors.success },
                ].map(stat => (
                  <View key={stat.label} style={s.maintStatCard}>
                    <Text style={[s.maintStatValue, { color: stat.color }]}>{stat.value}</Text>
                    <Text style={s.maintStatLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              {maintenanceOverview.latest.length > 0 ? (
                <View style={{ gap: 8 }}>
                  {maintenanceOverview.latest.map((item: any) => {
                    const awaitingTenantApproval = item.status === 'completed' && !item.tenant_approved_at;
                    const statusMeta = getMaintenanceStatusMeta(item.status, { awaitingTenantApproval });
                    const statusTone = getMaintenanceStatusTone(theme, item.status, { awaitingTenantApproval });
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={s.maintItem}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/${userRole === 'employee' ? 'agent' : userRole}/maintenance?openId=${item.id}&openType=maintenance` as any)}
                      >
                        <View style={[s.maintItemIcon, { backgroundColor: statusTone.backgroundColor }]}>
                          <MaterialIcons name={statusMeta.icon as any} size={15} color={statusTone.accentColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.maintItemTitle} numberOfLines={1}>{item.title || 'Bakım kaydı'}</Text>
                          <Text style={s.maintItemMeta}>{getMaintenanceNextAction(item, userRole)} • {formatMaintenanceDate(item.updated_at || item.created_at, 'relative')}</Text>
                        </View>
                        <View style={[s.maintBadge, { backgroundColor: statusTone.backgroundColor }]}>
                          <Text style={[s.maintBadgeText, { color: statusTone.textColor }]}>{statusMeta.shortLabel}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={s.maintEmpty}>
                  <Text style={s.maintEmptyText}>Bu mülk için kayıtlı bakım talebi bulunmuyor.</Text>
                </View>
              )}
            </Animated.View>

            {/* ── TAKVİM ── */}
            <Animated.View entering={FadeInDown.delay(290).duration(400)} style={s.card}>
              <SectionHead icon="event" title="Kira Takvimi" />
              {property.rent_day && (
                <View style={s.rentDayChip}>
                  <MaterialIcons name="repeat" size={14} color={theme.colors.primary} />
                  <Text style={s.rentDayChipText}>Her ayın {property.rent_day}. günü</Text>
                </View>
              )}
              <CalendarWidget
                role={userRole as any}
                userId={userData?.id || ''}
                propertyId={property.id}
                hideHeader={true}
              />
            </Animated.View>

            {/* ── BELGELER ── */}
            <DocumentVault propertyId={property.id} />

            {/* ── AKTİVİTE GEÇMİŞİ ── */}
            {activities.length > 0 && (
              <Animated.View entering={FadeInDown.delay(320).duration(400)} style={s.card}>
                <SectionHead icon="history" title="Aktivite Geçmişi" />
                <View style={{ gap: 0 }}>
                  {activities.map((act, i) => (
                    <View key={act.id} style={s.timelineItem}>
                      <View style={s.timelineLeft}>
                        <View style={[s.timelineDot, { backgroundColor: act.type === 'receipt' ? theme.colors.success : theme.colors.primary }]} />
                        {i < activities.length - 1 && <View style={s.timelineLine} />}
                      </View>
                      <View style={s.timelineBody}>
                        <View style={s.timelineRow}>
                          <Text style={s.timelineTitle}>{act.title}</Text>
                          <View style={[s.timelineIcon, { backgroundColor: act.type === 'receipt' ? theme.colors.successLight : theme.colors.primaryLight }]}>
                            <MaterialIcons name={act.type === 'receipt' ? 'receipt' : 'build'} size={13} color={act.type === 'receipt' ? theme.colors.success : theme.colors.primary} />
                          </View>
                        </View>
                        <Text style={s.timelineDate}>{new Date(act.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}
          </View>
        </AnimatedHeaderScrollView>

        {/* ── STICKY BOTTOM BAR ── */}
        {canEditProperty && (
          <View style={s.stickyBar}>
            {tenant && (
              <TouchableOpacity
                style={s.stickyRemoveBtn}
                onPress={handleRemoveTenant}
                disabled={removingTenant}
                activeOpacity={0.85}
              >
                {removingTenant ? (
                  <ActivityIndicator color={theme.colors.error} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="person-remove" size={18} color={theme.colors.error} />
                    <Text style={s.stickyRemoveBtnText}>Kiracı Çıkar</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.stickyEditBtn} onPress={handleEdit} activeOpacity={0.85}>
              <MaterialIcons name="edit" size={18} color="#fff" />
              <Text style={s.stickyEditBtnText}>Mülkü Düzenle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── İLETİŞİM MODAL ── */}
        <Modal visible={!!contactModal} transparent animationType="fade" onRequestClose={() => setContactModal(null)}>
          <TouchableOpacity style={s.contactOverlay} onPress={() => setContactModal(null)} activeOpacity={1}>
            <TouchableOpacity style={s.contactCard} activeOpacity={1} onPress={() => {}}>
              <View style={[s.contactAvatar, { backgroundColor: contactModal?.bgColor }]}>
                <MaterialIcons name={contactModal?.iconName as any} size={32} color={contactModal?.iconColor} />
              </View>
              <Text style={s.contactName}>{contactModal?.full_name}</Text>
              <Text style={s.contactRole}>{contactModal?.roleLabel}</Text>

              {contactModal?.phone ? (
                <TouchableOpacity
                  style={s.contactRow}
                  onPress={async () => {
                    try {
                      const url = `tel:${contactModal?.phone}`;
                      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
                      else Alert.alert(tr.common.error, 'Bu cihazda telefon araması desteklenmiyor.');
                    } catch { }
                  }}
                >
                  <View style={[s.contactRowIcon, { backgroundColor: theme.colors.successLight }]}>
                    <MaterialIcons name="phone" size={20} color={theme.colors.success} />
                  </View>
                  <Text style={s.contactRowText}>{contactModal.phone}</Text>
                  <MaterialIcons name="chevron-right" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={[s.contactRow, { opacity: 0.4 }]}>
                  <View style={[s.contactRowIcon, { backgroundColor: theme.colors.border }]}>
                    <MaterialIcons name="phone-disabled" size={20} color={theme.colors.textMuted} />
                  </View>
                  <Text style={s.contactRowText}>Telefon eklenmemiş</Text>
                </View>
              )}

              {contactModal?.email && (
                <TouchableOpacity
                  style={s.contactRow}
                  onPress={async () => {
                    try {
                      const url = `mailto:${contactModal?.email}`;
                      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
                    } catch { }
                  }}
                >
                  <View style={[s.contactRowIcon, { backgroundColor: theme.colors.primaryLight }]}>
                    <MaterialIcons name="email" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={s.contactRowText}>{contactModal.email}</Text>
                  <MaterialIcons name="chevron-right" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.contactCloseBtn} onPress={() => setContactModal(null)}>
                <Text style={s.contactCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </AnimatedScreen>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, padding: 20 },
  stateCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    backgroundColor: theme.colors.navGlass,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    padding: 22,
    ...theme.shadows.sm,
  },
  stateTitle: { marginTop: 12, fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, textAlign: 'center' },
  stateText: { marginTop: 8, fontSize: 14, lineHeight: 20, color: theme.colors.textSecondary, textAlign: 'center' },
  stateActions: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
  statePrimaryBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  statePrimaryText: { color: theme.colors.textInverse, fontWeight: '800' },
  stateSecondaryBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stateSecondaryText: { color: theme.colors.textPrimary, fontWeight: '700' },
  scrollContent: { paddingBottom: 120 },

  // Header
  floatBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.navGlass,
    borderWidth: 1, borderColor: theme.colors.border,
    justifyContent: 'center', alignItems: 'center',
    ...theme.shadows.sm,
  },
  headerActions: { flexDirection: 'row', gap: 8 },

  // Hero
  heroWrap: { width: '100%', aspectRatio: 4 / 3, position: 'relative' },
  heroImage: { height: '100%' },
  heroGradient: { ...StyleSheet.absoluteFillObject, top: '40%' },
  heroBadge: {
    position: 'absolute', top: 14, right: 14,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  dotsRow: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  heroFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  heroLocation: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  // Price Band
  priceBand: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 18,
    padding: 16,
    ...theme.shadows.sm,
    zIndex: 10,
  },
  priceBandItem: { flex: 1, alignItems: 'center' },
  priceBandValue: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
  priceBandLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 3, fontWeight: '500' },
  priceBandDivider: { width: 1, backgroundColor: theme.colors.border, marginHorizontal: 4 },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 22, paddingBottom: 16 },

  // Card
  card: {
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },

  // Section Header
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  sectionAction: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },

  // Info Row
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoRowIcon: { width: 28, alignItems: 'center' },
  infoRowLabel: { flex: 1, fontSize: 13, color: theme.colors.textMuted, fontWeight: '500', marginLeft: 6 },
  infoRowValue: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },

  // Amenities
  amenityChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  amenityChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

  // People
  personCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, paddingVertical: 10,
    marginBottom: 8,
  },
  personCardDashed: { paddingHorizontal: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  personAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  personInfo: { flex: 1 },
  personRole: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5 },
  personName: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 2 },
  personCallBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.surface2, alignItems: 'center', justifyContent: 'center' },

  // Maintenance
  maintStatRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  maintStatCard: {
    flex: 1,
    borderRadius: 12, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  maintStatValue: { fontSize: 20, fontWeight: '800' },
  maintStatLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', marginTop: 3 },
  maintItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, paddingVertical: 10,
  },
  maintItemIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  maintItemTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  maintItemMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 3 },
  maintBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  maintBadgeText: { fontSize: 11, fontWeight: '700' },
  maintEmpty: { borderRadius: 12, paddingVertical: 10 },
  maintEmptyText: { fontSize: 13, color: theme.colors.textMuted },

  // Calendar chip
  rentDayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    marginBottom: 12,
  },
  rentDayChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

  // Timeline
  timelineItem: { flexDirection: 'row', gap: 12, minHeight: 44 },
  timelineLeft: { alignItems: 'center', width: 14, paddingTop: 2 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { width: 2, flex: 1, backgroundColor: theme.colors.border, marginTop: 4 },
  timelineBody: { flex: 1, paddingBottom: 12 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, flex: 1, marginRight: 8 },
  timelineIcon: { width: 26, height: 26, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  timelineDate: { fontSize: 11, color: theme.colors.textMuted, marginTop: 3 },

  // Sticky Bar
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24,
  },
  stickyRemoveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1.5, borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorLight,
  },
  stickyRemoveBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.error },
  stickyEditBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13,
    borderRadius: 14, backgroundColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  stickyEditBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Contact Modal
  contactOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  contactCard: { backgroundColor: theme.colors.surface, borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', ...theme.shadows.md },
  contactAvatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  contactName: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary, textAlign: 'center' },
  contactRole: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '700', marginTop: 4, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  contactRowIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  contactRowText: { flex: 1, fontSize: 15, color: theme.colors.textPrimary, fontWeight: '600' },
  contactCloseBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: theme.colors.primary, borderRadius: 12 },
  contactCloseBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.textInverse },
}));
