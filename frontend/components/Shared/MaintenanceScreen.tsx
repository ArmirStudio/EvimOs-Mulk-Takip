import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { tr } from '../../app/translations';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';
import { listMaintenance, listReceipts } from '../../services/appApi';
import { createSignedStorageUrl } from '../../services/supabaseStorage';
import { supabase } from '../../services/supabase';
import { formatCurrency } from '../../utils/propertyHelpers';
import {
  formatMaintenanceDate,
  getMaintenanceHeroCopy,
  getMaintenanceNextAction,
  getMaintenancePriorityMeta,
  getMaintenancePriorityTone,
  getMaintenancePropertyLabel,
  getMaintenanceStatusMeta,
  getMaintenanceStatusTone,
} from '../../utils/maintenancePresentation';
import { MaintenanceDetailView } from './MaintenanceDetailView';
import AnimatedScreen from './AnimatedScreen';
import BottomSheetModal from './BottomSheetModal';
import { ReceiptDetailView } from './ReceiptDetailView';

type MaintenanceFilter = 'all' | 'pending' | 'in_progress' | 'awaiting_tenant' | 'completed' | 'rejected';
type LandlordTab = 'maintenance' | 'receipts' | 'documents';
type ReceiptFilter = 'all' | 'rent' | 'dues' | 'other' | 'approved' | 'pending' | 'rejected' | 'withdrawn';

type Receipt = {
  id: string;
  property_id: string;
  property_address?: string;
  receipt_type: string;
  status: string;
  amount?: number | null;
  uploader_name?: string | null;
  created_at: string;
};

type ArchiveDocument = {
  id: string;
  property_id: string;
  category: string;
  title: string;
  file_url: string;
  storage_path?: string | null;
  created_at: string;
  property_label: string;
};

const LANDLORD_TABS: { key: LandlordTab; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'maintenance', label: 'Aktif Talepler', icon: 'build' },
  { key: 'receipts', label: 'Dekontlar', icon: 'receipt-long' },
  { key: 'documents', label: 'Belgeler', icon: 'description' },
];

const RECEIPT_FILTERS: { key: ReceiptFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'rent', label: 'Kira' },
  { key: 'dues', label: 'Aidat' },
  { key: 'other', label: 'Diğer' },
  { key: 'approved', label: 'Onaylı' },
  { key: 'pending', label: 'Bekleyen' },
  { key: 'rejected', label: 'Reddedilen' },
  { key: 'withdrawn', label: 'Geri Alınan' },
];

function getActorRoute(role?: string | null) {
  return role === 'employee' ? 'agent' : role || 'tenant';
}

function receiptTypeLabel(type: string): string {
  if (type === 'rent') return 'Kira';
  if (type === 'dues') return 'Aidat';
  return 'Diğer';
}

function receiptStatusLabel(status: string): string {
  if (status === 'approved') return 'Onaylı';
  if (status === 'pending') return 'Bekleyen';
  if (status === 'rejected') return 'Reddedildi';
  if (status === 'withdrawn') return 'Geri Alındı';
  return status;
}

function receiptStatusStyle(theme: ReturnType<typeof useAppTheme>, status: string) {
  if (status === 'approved') {
    return { bg: theme.colors.successLight, text: theme.colors.successText };
  }
  if (status === 'pending') {
    return { bg: theme.colors.warningLight, text: theme.colors.warningText };
  }
  if (status === 'withdrawn') {
    return { bg: theme.colors.surface2, text: theme.colors.textSecondary };
  }
  return { bg: theme.colors.errorLight, text: theme.colors.errorText };
}

function documentCategoryLabel(category: string) {
  if (category === 'contract') return tr.documents.contract;
  if (category === 'insurance') return tr.documents.insurance;
  if (category === 'deed') return tr.documents.deed;
  if (category === 'bill') return tr.documents.bill;
  return tr.documents.other;
}

export default function MaintenanceScreen() {
  const { userData, loading: userLoading } = useUserData();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const s = useStyles();
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<MaintenanceFilter>('all');
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);
  const [landlordTab, setLandlordTab] = useState<LandlordTab>('maintenance');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [receiptFilter, setReceiptFilter] = useState<ReceiptFilter>('all');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const userRole = userData?.role || 'tenant';
  const actorRoute = getActorRoute(userRole);
  const isOfficeViewer = userRole === 'agent' || userRole === 'employee' || userRole === 'admin';
  const canOpenArchive = isOfficeViewer;
  const filterOptions = useMemo(() => {
    if (isOfficeViewer) {
      return [
        { key: 'all' as const, label: 'Tümü' },
        { key: 'pending' as const, label: tr.maintenance.firstActionQueue },
        { key: 'in_progress' as const, label: tr.maintenance.fieldWorkQueue },
        { key: 'awaiting_tenant' as const, label: tr.maintenance.tenantApprovalQueue },
        { key: 'completed' as const, label: 'Tamamlanan' },
        { key: 'rejected' as const, label: 'Reddedilen' },
      ];
    }

    if (userRole === 'landlord') {
      return [
        { key: 'all' as const, label: 'Tümü' },
        { key: 'pending' as const, label: tr.maintenance.firstActionQueue },
        { key: 'in_progress' as const, label: tr.maintenance.fieldWorkQueue },
        { key: 'awaiting_tenant' as const, label: tr.maintenance.tenantApprovalQueue },
        { key: 'completed' as const, label: 'Tamamlanan' },
        { key: 'rejected' as const, label: 'Reddedilen' },
      ];
    }

    return [
      { key: 'all' as const, label: 'Tümü' },
      { key: 'pending' as const, label: 'Bekliyor' },
      { key: 'in_progress' as const, label: 'Devam Ediyor' },
      { key: 'awaiting_tenant' as const, label: 'Onay Bekliyor' },
      { key: 'completed' as const, label: 'Tamamlandı' },
      { key: 'rejected' as const, label: 'Reddedildi' },
    ];
  }, [isOfficeViewer, userRole]);

  useEffect(() => {
    const openId = params.openId as string | undefined;
    const openType = params.openType as string | undefined;
    const tab = params.tab as string | undefined;

    if (openId && openType === 'maintenance') {
      setLandlordTab('maintenance');
      setSelectedMaintenanceId(openId);
    }
    if (openId && openType === 'receipt') {
      setLandlordTab('receipts');
      setSelectedReceiptId(openId);
    }
    if (tab === 'receipts' || tab === 'archive') {
      setLandlordTab('receipts');
    }
    if (tab === 'documents') {
      setLandlordTab('documents');
    }
  }, [params.openId, params.openType, params.tab]);

  const loadRequests = useCallback(async () => {
    if (!userData) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const response = await listMaintenance();

      const nextRequests = (response.maintenance_requests || []).map((item: any) => ({
        ...item,
        property_address: getMaintenancePropertyLabel(item),
      }));

      setRequests(nextRequests);
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData]);

  const loadArchiveData = useCallback(async () => {
    if (!userData?.id || userData.role !== 'landlord') {
      return;
    }

    setArchiveLoading(true);
    try {
      const { data: propertyRowsData } = await supabase
        .from('properties')
        .select('id, address, city, district')
        .eq('landlord_id', userData.id);

      const propertyRows = propertyRowsData || [];
      const propertyIds = propertyRows.map((item: any) => item.id);
      const propertyLabelMap = new Map(
        propertyRows.map((item: any) => [
          item.id,
          [item.address, item.city, item.district].filter(Boolean).join(', ') || tr.receipts.unknownProperty,
        ])
      );

      const response = await listReceipts();
      setReceipts(
        (response.receipts || []).map((item: any) => ({
          ...item,
          property_address:
            [item.property_address, item.property_city, item.property_district].filter(Boolean).join(', ') ||
            tr.receipts.unknownProperty,
        }))
      );

      if (propertyIds.length > 0) {
        const { data: docs } = await supabase
          .from('property_documents')
          .select('id, property_id, category, title, file_url, storage_path, created_at')
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false });
        setDocuments(
          ((docs as any[]) || []).map((item) => ({
            ...item,
            property_label: propertyLabelMap.get(item.property_id) || tr.receipts.unknownProperty,
          }))
        );
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Landlord archive load error:', error);
      setReceipts([]);
      setDocuments([]);
    } finally {
      setArchiveLoading(false);
      setRefreshing(false);
    }
  }, [userData?.id, userData?.role]);

  useFocusEffect(
    useCallback(() => {
      if (!userLoading && userData) {
        loadRequests();
        if (userData.role === 'landlord') {
          loadArchiveData();
        }
      }
    }, [loadArchiveData, loadRequests, userData, userLoading])
  );

  useEffect(() => {
    if (!userLoading && !userData) {
      setLoading(false);
      setRefreshing(false);
      setArchiveLoading(false);
    }
  }, [userData, userLoading]);

  const summary = useMemo(() => {
    const pending = requests.filter((item) => item.status === 'pending').length;
    const inProgress = requests.filter((item) => item.status === 'in_progress').length;
    const completed = requests.filter((item) => item.status === 'completed').length;
    const rejected = requests.filter((item) => item.status === 'rejected').length;
    const critical = requests.filter((item) => item.priority === 'high').length;
    const awaitingTenantApproval = requests.filter(
      (item) => item.status === 'completed' && !!item.property_tenant_id && !item.tenant_approved_at
    ).length;

    return {
      total: requests.length,
      pending,
      inProgress,
      completed,
      rejected,
      critical,
      awaitingTenantApproval,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const awaitingTenantApproval =
        item.status === 'completed' && !!item.property_tenant_id && !item.tenant_approved_at;

      if (filter === 'awaiting_tenant') {
        return awaitingTenantApproval;
      }
      if (filter === 'completed') {
        return item.status === 'completed' && !awaitingTenantApproval;
      }
      if (filter === 'all') {
        return true;
      }
      return item.status === filter;
    });
  }, [filter, requests]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      if (receiptFilter === 'rent' && receipt.receipt_type !== 'rent') return false;
      if (receiptFilter === 'dues' && receipt.receipt_type !== 'dues') return false;
      if (receiptFilter === 'other' && receipt.receipt_type !== 'other') return false;
      if (['approved', 'pending', 'rejected', 'withdrawn'].includes(receiptFilter) && receipt.status !== receiptFilter) {
        return false;
      }

      if (!archiveSearch.trim()) {
        return true;
      }

      const query = archiveSearch.trim().toLocaleLowerCase('tr');
      return (
        (receipt.property_address || '').toLocaleLowerCase('tr').includes(query) ||
        (receipt.uploader_name || '').toLocaleLowerCase('tr').includes(query)
      );
    });
  }, [archiveSearch, receiptFilter, receipts]);

  const filteredDocuments = useMemo(() => {
    if (!archiveSearch.trim()) {
      return documents;
    }

    const query = archiveSearch.trim().toLocaleLowerCase('tr');
    return documents.filter((document) =>
      `${document.title} ${document.property_label} ${documentCategoryLabel(document.category)}`
        .toLocaleLowerCase('tr')
        .includes(query)
    );
  }, [archiveSearch, documents]);

  const receiptSummary = useMemo(() => {
    return {
      approvedTotal: receipts
        .filter((item) => item.status === 'approved')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      approvedCount: receipts.filter((item) => item.status === 'approved').length,
      pendingCount: receipts.filter((item) => item.status === 'pending').length,
    };
  }, [receipts]);

  const heroCopy = getMaintenanceHeroCopy(userRole, summary);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
    if (userRole === 'landlord') {
      loadArchiveData();
    }
  };

  const renderHeroStats = () => {
    if (userRole === 'tenant') {
      return (
        <View style={s.heroStatGrid}>
          <View style={s.heroStatCard}>
            <Text style={s.heroStatValue}>{summary.pending + summary.inProgress}</Text>
            <Text style={s.heroStatLabel}>{tr.maintenance.openWork}</Text>
          </View>
          <View style={s.heroStatCard}>
            <Text style={s.heroStatValue}>{summary.awaitingTenantApproval}</Text>
            <Text style={s.heroStatLabel}>{tr.maintenance.waitingApprovalShort}</Text>
          </View>
          <View style={s.heroStatCard}>
            <Text style={s.heroStatValue}>{summary.completed}</Text>
            <Text style={s.heroStatLabel}>{tr.maintenance.completed}</Text>
          </View>
        </View>
      );
    }

    if (userRole === 'landlord') {
      return (
        <View style={s.heroStatGrid}>
          <View style={s.heroStatCard}>
            <Text style={s.heroStatValue}>{summary.pending + summary.inProgress}</Text>
            <Text style={s.heroStatLabel}>{tr.maintenance.openRequest}</Text>
          </View>
          <View style={s.heroStatCard}>
            <Text style={s.heroStatValue}>{summary.critical}</Text>
            <Text style={s.heroStatLabel}>Kritik</Text>
          </View>
          <View style={s.heroStatCard}>
            <Text style={s.heroStatValue}>{summary.completed}</Text>
            <Text style={s.heroStatLabel}>{tr.maintenance.closedItems}</Text>
          </View>
        </View>
      );
    }

    return (
        <View style={s.heroStatGrid}>
          <View style={s.heroStatCard}>
            <Text style={s.heroStatValue}>{summary.pending}</Text>
            <Text style={s.heroStatLabel}>{tr.maintenance.firstActionQueue}</Text>
          </View>
          <View style={s.heroStatCard}>
            <Text style={s.heroStatValue}>{summary.inProgress}</Text>
            <Text style={s.heroStatLabel}>{tr.maintenance.fieldWorkQueue}</Text>
          </View>
          <View style={s.heroStatCard}>
            <Text style={s.heroStatValue}>{summary.awaitingTenantApproval}</Text>
            <Text style={s.heroStatLabel}>{tr.maintenance.waitingApproval}</Text>
          </View>
        </View>
      );
  };

  const renderEmpty = () => (
    <View style={s.emptyContainer}>
      <View style={s.emptyIconBg}>
        <MaterialIcons name="inbox" size={40} color={theme.colors.textMuted} />
      </View>
      <Text style={s.emptyTitle}>{tr.maintenance.emptyTitle}</Text>
      <Text style={s.emptySubtext}>
        {filter === 'all'
          ? userRole === 'tenant'
            ? tr.maintenance.emptyTenantAll
            : tr.maintenance.emptyGenericAll
          : `${filterOptions.find((item) => item.key === filter)?.label || 'Seçili kuyruk'} ${tr.maintenance.emptyQueueSuffix}`}
      </Text>
      {userRole === 'tenant' && (
        <TouchableOpacity
          style={s.emptyBtn}
          onPress={() => router.push('/tenant/maintenance-request' as any)}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={18} color={theme.colors.textInverse} />
          <Text style={s.emptyBtnText}>{tr.maintenance.createRecord}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLandlordTabs = () => {
    if (userRole !== 'landlord') {
      return null;
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.landlordTabRow}>
        {LANDLORD_TABS.map((item) => {
          const active = landlordTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.landlordTab, active && s.landlordTabActive]}
              onPress={() => setLandlordTab(item.key)}
              activeOpacity={0.85}
            >
              <MaterialIcons name={item.icon} size={17} color={active ? theme.colors.textInverse : theme.colors.textSecondary} />
              <Text style={[s.landlordTabText, active && s.landlordTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderArchiveSearch = (placeholder: string) => (
    <View style={s.archiveSearchRow}>
      <MaterialIcons name="search" size={20} color={theme.colors.textMuted} />
      <TextInput
        style={s.archiveSearchInput}
        value={archiveSearch}
        onChangeText={setArchiveSearch}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={placeholder}
      />
      {archiveSearch.length > 0 && (
        <TouchableOpacity onPress={() => setArchiveSearch('')} accessibilityLabel="Aramayı temizle">
          <MaterialIcons name="close" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );

  const openDocument = async (document: ArchiveDocument) => {
    try {
      const url = await createSignedStorageUrl(
        'property-documents',
        document.storage_path || document.file_url
      );
      if (url) {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert(tr.common.error, tr.receipts.documentOpenError);
    }
  };

  const renderReceipt = ({ item }: { item: Receipt }) => {
    const badge = receiptStatusStyle(theme, item.status);
    const dateStr = new Date(item.created_at).toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
    });

    return (
      <TouchableOpacity style={s.archiveCard} activeOpacity={0.82} onPress={() => setSelectedReceiptId(item.id)}>
        <View style={s.archiveIconBox}>
          <MaterialIcons name="receipt-long" size={22} color={theme.colors.primary} />
        </View>
        <View style={s.archiveCardContent}>
          <View style={s.archiveCardRow}>
            <Text style={s.archiveCardTitle} numberOfLines={1}>{receiptTypeLabel(item.receipt_type)} Dekontu</Text>
            <View style={[s.archiveBadge, { backgroundColor: badge.bg }]}>
              <Text style={[s.archiveBadgeText, { color: badge.text }]}>{receiptStatusLabel(item.status)}</Text>
            </View>
          </View>
          <Text style={s.archiveCardMeta} numberOfLines={1}>{item.property_address || tr.receipts.unknownProperty}</Text>
          <View style={s.archiveCardRow}>
            {item.amount != null ? <Text style={s.archiveAmount}>{formatCurrency(Number(item.amount))}</Text> : <View />}
            <Text style={s.archiveCardDate}>{dateStr}</Text>
          </View>
          {!!item.uploader_name && <Text style={s.archiveCardMeta} numberOfLines={1}>Yükleyen: {item.uploader_name}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDocument = ({ item }: { item: ArchiveDocument }) => (
    <TouchableOpacity style={s.archiveCard} activeOpacity={0.82} onPress={() => void openDocument(item)}>
      <View style={s.archiveIconBox}>
        <MaterialIcons name="description" size={22} color={theme.colors.primary} />
      </View>
      <View style={s.archiveCardContent}>
        <Text style={s.archiveCardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.archiveCardMeta} numberOfLines={1}>
          {documentCategoryLabel(item.category)} · {item.property_label}
        </Text>
        <Text style={s.archiveCardDate}>
          {new Date(item.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  const renderArchiveEmpty = (title: string, subtitle: string, icon: keyof typeof MaterialIcons.glyphMap) => (
    <View style={s.emptyContainer}>
      <View style={s.emptyIconBg}>
        <MaterialIcons name={icon} size={40} color={theme.colors.textMuted} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySubtext}>{subtitle}</Text>
    </View>
  );

  const renderRequest = ({ item }: { item: any }) => {
    const awaitingTenantApproval =
      item.status === 'completed' && !!item.property_tenant_id && !item.tenant_approved_at;
    const statusMeta = getMaintenanceStatusMeta(item.status, { awaitingTenantApproval });
    const priorityMeta = getMaintenancePriorityMeta(item.priority);
    const statusTone = getMaintenanceStatusTone(theme, item.status, { awaitingTenantApproval });
    const priorityTone = getMaintenancePriorityTone(theme, item.priority);
    const photoCount = Array.isArray(item.photo_urls) ? item.photo_urls.length : 0;
    const nextAction = getMaintenanceNextAction(item, userRole);

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.9}
        onPress={() => setSelectedMaintenanceId(item.id)}
      >
        <View style={s.cardAccentWrap}>
          <View style={[s.cardAccent, { backgroundColor: statusTone.accentColor }]} />
        </View>

        <View style={s.cardContent}>
          <View style={s.cardHeader}>
            <View style={s.cardIconBg}>
              <MaterialIcons name={statusMeta.icon as any} size={20} color={statusTone.accentColor} />
            </View>
            <View style={s.cardHeaderMeta}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {item.title || 'Bakim Talebi'}
              </Text>
              <Text style={s.cardAddress} numberOfLines={1}>
                {item.property_address}
              </Text>
            </View>
          </View>

          {!!item.description && (
            <Text style={s.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={s.badgesRow}>
            <View
              style={[
                s.badge,
                { backgroundColor: statusTone.backgroundColor, borderColor: statusTone.borderColor },
              ]}
            >
              <Text style={[s.badgeText, { color: statusTone.textColor }]}>{statusMeta.label}</Text>
            </View>
            <View
              style={[
                s.badge,
                { backgroundColor: priorityTone.backgroundColor, borderColor: priorityTone.borderColor },
              ]}
            >
              <Text style={[s.badgeText, { color: priorityTone.textColor }]}>{priorityMeta.label}</Text>
            </View>
          </View>

          <View style={s.nextActionCard}>
            <Text style={s.nextActionLabel}>{tr.tenant.nextStep}</Text>
            <Text style={s.nextActionValue}>{nextAction}</Text>
          </View>

          <View style={s.cardFooter}>
            <View style={s.footerItem}>
              <MaterialIcons name="schedule" size={13} color={theme.colors.textMuted} />
              <Text style={s.cardDate}>{formatMaintenanceDate(item.updated_at || item.created_at, 'relative')}</Text>
            </View>
            <View style={s.footerItem}>
              <MaterialIcons name="photo-library" size={13} color={theme.colors.textMuted} />
              <Text style={s.cardDate}>{photoCount} foto</Text>
            </View>
            <View style={{ flex: 1 }} />
            <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (userRole === 'landlord' && landlordTab === 'receipts') {
    return (
      <AnimatedScreen type="fade">
        <View style={[s.container, { paddingTop: insets.top }]}>
          <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
          <FlatList
            data={archiveLoading ? [] : filteredReceipts}
            renderItem={renderReceipt}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <>
                <View style={s.header}>
                  <View>
                    <Text style={s.headerTitle}>Talepler</Text>
                    <Text style={s.headerSubtitle}>Bakım, dekont ve belgeleri tek merkezden yönetin.</Text>
                  </View>
                </View>
                {renderLandlordTabs()}
                <View style={s.receiptSummaryCard}>
                  <Text style={s.receiptSummaryLabel}>TOPLAM GELİR</Text>
                  <Text style={s.receiptSummaryAmount}>{formatCurrency(receiptSummary.approvedTotal)}</Text>
                  <View style={s.receiptSummaryRow}>
                    <View style={s.receiptSummaryPill}>
                      <MaterialIcons name="check-circle" size={14} color={theme.colors.successText} />
                      <Text style={[s.receiptSummaryPillText, { color: theme.colors.successText }]}>
                        {receiptSummary.approvedCount} onaylı
                      </Text>
                    </View>
                    <View style={[s.receiptSummaryPill, { backgroundColor: theme.colors.warningLight }]}>
                      <MaterialIcons name="hourglass-empty" size={14} color={theme.colors.warningText} />
                      <Text style={[s.receiptSummaryPillText, { color: theme.colors.warningText }]}>
                        {receiptSummary.pendingCount} bekleyen
                      </Text>
                    </View>
                  </View>
                </View>
                {renderArchiveSearch('Mülk veya dekont ara')}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.receiptFilterRow}>
                  {RECEIPT_FILTERS.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[s.receiptFilterChip, receiptFilter === item.key && s.receiptFilterChipActive]}
                      onPress={() => setReceiptFilter(item.key)}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.receiptFilterText, receiptFilter === item.key && s.receiptFilterTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {!archiveLoading && <Text style={s.archiveResultCount}>{filteredReceipts.length} dekont</Text>}
              </>
            }
            ListEmptyComponent={
              archiveLoading
                ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
                : renderArchiveEmpty('Henüz dekont yok', 'Dekont arşivi bu sekmede listelenecek.', 'receipt-long')
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
            contentContainerStyle={[s.listContent, !archiveLoading && filteredReceipts.length === 0 && { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
          />
          <BottomSheetModal
            visible={!!selectedReceiptId}
            onClose={() => {
              setSelectedReceiptId(null);
              loadArchiveData();
            }}
          >
            {selectedReceiptId && (
              <ReceiptDetailView
                receiptId={selectedReceiptId}
                onClose={() => {
                  setSelectedReceiptId(null);
                  loadArchiveData();
                }}
              />
            )}
          </BottomSheetModal>
        </View>
      </AnimatedScreen>
    );
  }

  if (userRole === 'landlord' && landlordTab === 'documents') {
    return (
      <AnimatedScreen type="fade">
        <View style={[s.container, { paddingTop: insets.top }]}>
          <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
          <FlatList
            data={archiveLoading ? [] : filteredDocuments}
            renderItem={renderDocument}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <>
                <View style={s.header}>
                  <View>
                    <Text style={s.headerTitle}>Talepler</Text>
                    <Text style={s.headerSubtitle}>Bakım, dekont ve belgeleri tek merkezden yönetin.</Text>
                  </View>
                </View>
                {renderLandlordTabs()}
                {renderArchiveSearch('Belge veya mülk ara')}
                {!archiveLoading && <Text style={s.archiveResultCount}>{filteredDocuments.length} belge</Text>}
              </>
            }
            ListEmptyComponent={
              archiveLoading
                ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
                : renderArchiveEmpty('Henüz belge yok', 'Mülklerinize ait belgeler burada görünecek.', 'description')
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
            contentContainerStyle={[s.listContent, !archiveLoading && filteredDocuments.length === 0 && { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen type="fade">
      <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      <FlatList
        data={loading ? [] : filteredRequests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[s.listContent, !loading && filteredRequests.length === 0 && { flexGrow: 1 }]}
        ListHeaderComponent={
          <>
            <View style={s.header}>
              <View>
                <Text style={s.headerTitle}>
                  {isOfficeViewer
                    ? tr.maintenance.operationsTitle
                    : userRole === 'landlord'
                    ? 'Talepler'
                    : tr.maintenance.tenantScreenTitle}
                </Text>
                <Text style={s.headerSubtitle}>
                  {userRole === 'tenant'
                    ? tr.maintenance.tenantScreenSubtitle
                    : userRole === 'landlord'
                    ? tr.maintenance.landlordScreenSubtitle
                    : tr.maintenance.operationsSubtitle}
                </Text>
              </View>
              <View style={s.headerRight}>
                {userRole === 'tenant' && (
                  <TouchableOpacity
                    style={s.headerAddBtn}
                    onPress={() => router.push('/tenant/maintenance-request' as any)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="add" size={24} color={theme.colors.textInverse} />
                  </TouchableOpacity>
                )}
                {canOpenArchive && (
                  <TouchableOpacity
                    style={[s.headerAddBtn, s.archiveBtn]}
                    onPress={() => router.push(`/${actorRoute}/archive` as any)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="folder-open" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {renderLandlordTabs()}

            <View style={s.heroCard}>
              <Text style={s.heroEyebrow}>{heroCopy.eyebrow}</Text>
              <Text style={s.heroTitle}>{heroCopy.title}</Text>
              <Text style={s.heroSubtitle}>{heroCopy.subtitle}</Text>
              {renderHeroStats()}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterScroll}
            >
              {filterOptions.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[s.filterChip, filter === item.key && s.filterChipActive]}
                  onPress={() => setFilter(item.key)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === item.key }}
                >
                  <Text style={[s.filterText, filter === item.key && s.filterTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        }
        ListEmptyComponent={!loading ? renderEmpty : null}
        ListFooterComponent={loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <BottomSheetModal
        visible={!!selectedMaintenanceId}
        onClose={() => {
          setSelectedMaintenanceId(null);
          loadRequests();
        }}
      >
        {selectedMaintenanceId && (
          <MaintenanceDetailView
            requestId={selectedMaintenanceId}
            onClose={() => {
              setSelectedMaintenanceId(null);
              loadRequests();
            }}
          />
        )}
      </BottomSheetModal>
      </View>
    </AnimatedScreen>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      gap: 12,
    },
    headerTitle: { fontSize: 28, fontWeight: '700', color: theme.colors.textPrimary },
    headerSubtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4, maxWidth: 260, lineHeight: 18 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerAddBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    archiveBtn: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginLeft: 8,
    },
    landlordTabRow: {
      paddingHorizontal: 16,
      gap: 8,
      paddingBottom: 12,
    },
    landlordTab: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    landlordTabActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    landlordTabText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    landlordTabTextActive: {
      color: theme.colors.textInverse,
    },
    archiveSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      ...theme.shadows.sm,
    },
    archiveSearchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textPrimary,
      paddingVertical: 2,
    },
    receiptSummaryCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 20,
      backgroundColor: theme.colors.dark,
      padding: 20,
      ...theme.shadows.md,
    },
    receiptSummaryLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textInverse,
      opacity: 0.72,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    receiptSummaryAmount: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.colors.primary,
      marginBottom: 14,
    },
    receiptSummaryRow: { flexDirection: 'row', gap: 8 },
    receiptSummaryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.colors.successLight,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    receiptSummaryPillText: {
      fontSize: 12,
      fontWeight: '700',
    },
    receiptFilterRow: {
      paddingHorizontal: 16,
      gap: 8,
      paddingBottom: 12,
    },
    receiptFilterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    receiptFilterChipActive: {
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.primary,
    },
    receiptFilterText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    receiptFilterTextActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    archiveResultCount: {
      marginHorizontal: 16,
      marginBottom: 10,
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    archiveCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      ...theme.shadows.sm,
    },
    archiveIconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    archiveCardContent: { flex: 1, gap: 4 },
    archiveCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    archiveCardTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    archiveCardMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    archiveCardDate: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    archiveAmount: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    archiveBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
    },
    archiveBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    heroCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      paddingVertical: 18,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.divider,
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    heroTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary },
    heroSubtitle: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginTop: 8 },
    heroStatGrid: { flexDirection: 'row', gap: 10, marginTop: 18 },
    heroStatCard: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      alignItems: 'center',
    },
    heroStatValue: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
    heroStatLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginTop: 4, textTransform: 'uppercase' },
    filterScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
    filterChip: {
      height: 38,
      paddingHorizontal: 16,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
    filterTextActive: { color: theme.colors.textInverse },
    listContent: { paddingBottom: 120, flexGrow: 1 },
    card: {
      marginHorizontal: 16,
      marginBottom: 14,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      flexDirection: 'row',
      ...theme.shadows.sm,
    },
    cardAccentWrap: {
      width: 10,
      alignItems: 'stretch',
    },
    cardAccent: {
      flex: 1,
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
    },
    cardContent: {
      flex: 1,
      padding: 16,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    cardIconBg: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderMeta: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
    cardAddress: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
    cardDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginTop: 12,
    },
    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
    nextActionCard: {
      marginTop: 12,
      borderRadius: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    nextActionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    nextActionValue: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      lineHeight: 18,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 14,
    },
    footerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    cardDate: { fontSize: 12, color: theme.colors.textMuted },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyIconBg: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 24,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
    },
    emptyBtnText: { color: theme.colors.textInverse, fontWeight: '700', fontSize: 14 },
  })
);
