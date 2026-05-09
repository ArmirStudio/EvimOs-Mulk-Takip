import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { tr } from '../../app/translations';
import { createThemedStyles, getBadgeStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';
import { listMaintenance, listProperties, listReceipts } from '../../services/appApi';
import { formatCurrency } from '../../utils/propertyHelpers';
import {
  formatMaintenanceDate,
  getMaintenanceNextAction,
  getMaintenanceStatusMeta,
  getMaintenanceStatusTone,
} from '../../utils/maintenancePresentation';
import AnimatedScreen from './AnimatedScreen';
import BottomSheetModal from './BottomSheetModal';
import { MaintenanceDetailView } from './MaintenanceDetailView';
import { ReceiptDetailView } from './ReceiptDetailView';
import { useGlobalBottomNavInset } from './AppBottomNav';

type SegmentKey = 'pending' | 'history';
type KindFilter = 'all' | 'payments' | 'maintenance';
type ItemKind = 'receipt' | 'maintenance';

type HubItem = {
  id: string;
  kind: ItemKind;
  group: SegmentKey;
  sortAt: string;
  title: string;
  subtitle: string;
  meta: string;
  statusLabel: string;
  statusTone: {
    background: string;
    border: string;
    text: string;
  };
  accentColor: string;
  amountLabel?: string;
  note?: string | null;
  raw: any;
};

const SEGMENTS: { key: SegmentKey; label: string }[] = [
  { key: 'pending', label: tr.tenant.pendingSegment },
  { key: 'history', label: tr.tenant.historySegment },
];

const FILTERS: { key: KindFilter; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'all', label: tr.tenant.allFilter, icon: 'dashboard' },
  { key: 'payments', label: tr.tenant.paymentsFilter, icon: 'receipt-long' },
  { key: 'maintenance', label: tr.tenant.maintenanceFilter, icon: 'build' },
];

const RECEIPT_TYPE_LABELS: Record<string, string> = {
  rent: 'Kira Odemesi',
  dues: 'Aidat Odemesi',
  other: 'Diğer Ödeme',
};

const RECEIPT_STATUS_LABELS: Record<string, string> = {
  pending: 'Bekleyen',
  approved: 'Onaylandi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri Alindi',
};

function formatMonthLabel(value?: string | null) {
  if (!value) return '-';
  const [year, month] = value.split('-');
  const monthIndex = Number(month) - 1;
  const monthNames = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];

  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value;
  }

  return `${monthNames[monthIndex]} ${year}`;
}

function getReceiptMeta(item: any) {
  if (item.status === 'pending') return tr.receipts.pendingReview;
  if (item.status === 'rejected') return tr.receipts.replacedReceipt;
  if (item.status === 'withdrawn') return tr.tenant.withdrawnRecord;
  return tr.tenant.closedPaymentRecord;
}

export default function TenantRequestsHubScreen() {
  const theme = useAppTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const bottomNavInset = useGlobalBottomNavInset();
  const badgeStyles = getBadgeStyles(theme);
  const { userData, loading: userLoading } = useUserData();
  const params = useLocalSearchParams<{ openId?: string; openType?: 'maintenance' | 'receipt'; focus?: 'payments' | 'maintenance' }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [segment, setSegment] = useState<SegmentKey>('pending');
  const [filter, setFilter] = useState<KindFilter>('all');
  const [property, setProperty] = useState<any | null>(null);
  const [maintenanceData, setMaintenanceData] = useState<any[]>([]);
  const [receiptsData, setReceiptsData] = useState<any[]>([]);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  useEffect(() => {
    if (params.focus === 'payments') {
      setFilter('payments');
    } else if (params.focus === 'maintenance') {
      setFilter('maintenance');
    }
  }, [params.focus]);

  useEffect(() => {
    if (params.openId && params.openType === 'maintenance') {
      setFilter('maintenance');
      setSelectedMaintenanceId(params.openId);
    }
    if (params.openId && params.openType === 'receipt') {
      setFilter('payments');
      setSelectedReceiptId(params.openId);
    }
  }, [params.openId, params.openType]);

  const loadData = useCallback(async () => {
    if (!userData) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const [propertiesResponse, maintenanceResponse, receiptsResponse] = await Promise.all([
        listProperties(),
        listMaintenance(),
        listReceipts(),
      ]);

      setProperty(propertiesResponse.properties?.[0] || null);
      setMaintenanceData(maintenanceResponse.maintenance_requests || []);
      setReceiptsData(receiptsResponse.receipts || []);
    } catch (error) {
      console.error('Tenant requests hub load error:', error);
      setProperty(null);
      setMaintenanceData([]);
      setReceiptsData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData]);

  useFocusEffect(
    useCallback(() => {
      if (!userLoading && userData?.role === 'tenant') {
        loadData();
      }
    }, [loadData, userData, userLoading])
  );

  useEffect(() => {
    if (!userLoading && (!userData || userData.role !== 'tenant')) {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData, userLoading]);

  const items = useMemo(() => {
    const maintenanceItems: HubItem[] = maintenanceData.map((item: any) => {
      const awaitingTenantApproval =
        item.status === 'completed' && !!item.property_tenant_id && !item.tenant_approved_at;
      const statusMeta = getMaintenanceStatusMeta(item.status, { awaitingTenantApproval });
      const tone = getMaintenanceStatusTone(theme, item.status, { awaitingTenantApproval });
      const isPendingGroup = item.status === 'pending' || item.status === 'in_progress' || awaitingTenantApproval;

      return {
        id: item.id,
        kind: 'maintenance',
        group: isPendingGroup ? 'pending' : 'history',
        sortAt: item.updated_at || item.created_at,
        title: item.title || 'Bakim kaydi',
        subtitle:
          [item.property_address, item.property_district, item.property_city].filter(Boolean).join(', ') ||
          tr.tenant.unknownProperty,
        meta: getMaintenanceNextAction(item, 'tenant'),
        statusLabel: statusMeta.label,
        statusTone: {
          background: tone.backgroundColor,
          border: tone.borderColor,
          text: tone.textColor,
        },
        accentColor: tone.accentColor,
        note: item.description,
        raw: item,
      };
    });

    const receiptItems: HubItem[] = receiptsData.map((item: any) => {
      const badge = (badgeStyles as any)[item.status] || badgeStyles.pending;
      const isPendingGroup = item.status === 'pending' || item.status === 'rejected';

      return {
        id: item.id,
        kind: 'receipt',
        group: isPendingGroup ? 'pending' : 'history',
        sortAt: item.updated_at || item.created_at,
        title: RECEIPT_TYPE_LABELS[item.receipt_type] || 'Odeme kaydi',
        subtitle:
          [item.property_address, item.property_district, item.property_city].filter(Boolean).join(', ') ||
          tr.tenant.unknownProperty,
        meta: getReceiptMeta(item),
        statusLabel: RECEIPT_STATUS_LABELS[item.status] || item.status || 'Bekleyen',
        statusTone: {
          background: badge.background,
          border: badge.border,
          text: badge.text,
        },
        accentColor: theme.colors.primary,
        amountLabel: formatCurrency(Number(item.amount || 0)),
        note: item.notes,
        raw: item,
      };
    });

    return [...maintenanceItems, ...receiptItems].sort(
      (left, right) => new Date(right.sortAt).getTime() - new Date(left.sortAt).getTime()
    );
  }, [badgeStyles, maintenanceData, receiptsData, theme]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.group !== segment) {
        return false;
      }
      if (filter === 'payments') return item.kind === 'receipt';
      if (filter === 'maintenance') return item.kind === 'maintenance';
      return true;
    });
  }, [filter, items, segment]);

  const summary = useMemo(() => {
    return {
      openItems: items.filter((item) => item.group === 'pending').length,
      completedItems: items.filter((item) => item.group === 'history').length,
      latestActivity: items[0]?.sortAt,
    };
  }, [items]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderHeader = () => {
    const rentDayLabel = property?.rent_day ? `${property.rent_day}. gun` : '-';
    const duesDayLabel = property?.dues_day ? `${property.dues_day}. gun` : 'Tanimsiz';
    const duesAmountLabel = property?.dues_amount ? formatCurrency(Number(property.dues_amount)) : 'Aidat yok';

    return (
      <>
        <View style={s.header}>
          <Text style={s.headerTitle}>{tr.tenant.requestsHubTitle}</Text>
          <Text style={s.headerSubtitle}>{tr.tenant.requestsHubSubtitle}</Text>
        </View>

        {property ? (
          <View style={s.heroCard}>
            <View style={s.heroCardTop}>
              <View style={s.heroIconWrap}>
                <MaterialIcons name="home-work" size={22} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroEyebrow}>{tr.tenant.currentHomeSummary}</Text>
                <Text style={s.heroTitle} numberOfLines={2}>{property.address || tr.tenant.unknownHome}</Text>
                <Text style={s.heroSubtitle}>{[property.district, property.city].filter(Boolean).join(', ')}</Text>
              </View>
            </View>

            <View style={s.metricRow}>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>{tr.tenant.openItems}</Text>
                <Text style={s.metricValue}>{summary.openItems}</Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>{tr.tenant.completedItems}</Text>
                <Text style={s.metricValue}>{summary.completedItems}</Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>{tr.tenant.latestActivity}</Text>
                <Text style={s.metricValueSmall}>
                  {summary.latestActivity ? formatMaintenanceDate(summary.latestActivity, 'relative') : '-'}
                </Text>
              </View>
            </View>

            <View style={s.paymentInfoCard}>
              <View style={s.paymentInfoCol}>
                <Text style={s.paymentInfoLabel}>{tr.tenant.rentAndDues}</Text>
                <Text style={s.paymentInfoValue}>{formatCurrency(Number(property.monthly_rent || 0))}</Text>
                <Text style={s.paymentInfoHint}>{`${tr.tenant.rentDueFormat} ${rentDayLabel}`}</Text>
              </View>
              <View style={s.paymentInfoDivider} />
              <View style={s.paymentInfoCol}>
                <Text style={s.paymentInfoLabel}>{tr.tenant.dueInfo}</Text>
                <Text style={s.paymentInfoValue}>{duesAmountLabel}</Text>
                <Text style={s.paymentInfoHint}>{`${tr.tenant.duesDueFormat} ${duesDayLabel}`}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={s.emptyPropertyCard}>
            <MaterialIcons name="home" size={28} color={theme.colors.textMuted} />
            <Text style={s.emptyPropertyTitle}>{tr.errors.noPropertyAssigned}</Text>
            <Text style={s.emptyPropertyText}>{tr.tenant.noPropertySummary}</Text>
          </View>
        )}

        {property ? (
          <View style={s.ctaRow}>
            <TouchableOpacity style={[s.ctaButton, s.ctaPrimary]} onPress={() => router.push('/tenant/upload-receipt' as any)} activeOpacity={0.88}>
              <MaterialIcons name="receipt-long" size={20} color={theme.colors.textInverse} />
              <Text style={s.ctaPrimaryText}>{tr.tenant.paymentAction}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctaButton, s.ctaSecondary]} onPress={() => router.push('/tenant/maintenance-request' as any)} activeOpacity={0.88}>
              <MaterialIcons name="build" size={20} color={theme.colors.primary} />
              <Text style={s.ctaSecondaryText}>{tr.tenant.maintenanceAction}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={s.segmentRow} accessibilityRole="tablist">
          {SEGMENTS.map((item) => {
            const isActive = item.key === segment;
            return (
              <TouchableOpacity
                key={item.key}
                style={[s.segmentButton, isActive && s.segmentButtonActive]}
                onPress={() => setSegment(item.key)}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[s.segmentText, isActive && s.segmentTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {FILTERS.map((item) => {
            const isActive = item.key === filter;
            return (
              <TouchableOpacity
                key={item.key}
                style={[s.filterChip, isActive && s.filterChipActive]}
                onPress={() => setFilter(item.key)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <MaterialIcons name={item.icon} size={16} color={isActive ? theme.colors.textInverse : theme.colors.textSecondary} />
                <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </>
    );
  };

  const renderItem = ({ item }: { item: HubItem }) => {
    const dateLabel = item.kind === 'maintenance' ? formatMaintenanceDate(item.sortAt, 'relative') : formatMonthLabel(item.raw.month);

    return (
      <TouchableOpacity
        style={s.itemCard}
        onPress={() => (item.kind === 'maintenance' ? setSelectedMaintenanceId(item.id) : setSelectedReceiptId(item.id))}
        activeOpacity={0.9}
      >
        <View style={[s.itemAccent, { backgroundColor: item.accentColor }]} />
        <View style={s.itemBody}>
          <View style={s.itemHeader}>
            <View style={[s.itemIconWrap, { backgroundColor: item.statusTone.background }]}>
              <MaterialIcons name={item.kind === 'maintenance' ? 'build' : 'receipt-long'} size={20} color={item.statusTone.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={s.itemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            </View>
            <View style={[s.statusChip, { backgroundColor: item.statusTone.background, borderColor: item.statusTone.border }]}>
              <Text style={[s.statusChipText, { color: item.statusTone.text }]}>{item.statusLabel}</Text>
            </View>
          </View>

          {item.amountLabel ? (
            <View style={s.amountWrap}>
              <Text style={s.amountValue}>{item.amountLabel}</Text>
              <Text style={s.amountMeta}>{dateLabel}</Text>
            </View>
          ) : null}

          <View style={s.metaPanel}>
            <Text style={s.metaLabel}>{tr.tenant.nextStep}</Text>
            <Text style={s.metaValue}>{item.meta}</Text>
          </View>

          {!!item.note && (
            <Text style={s.itemNote} numberOfLines={2}>{item.note}</Text>
          )}

          <View style={s.itemFooter}>
            <View style={s.footerPill}>
              <MaterialIcons name="schedule" size={13} color={theme.colors.textMuted} />
              <Text style={s.footerPillText}>
                {item.kind === 'maintenance' ? formatMaintenanceDate(item.sortAt, 'datetime') : dateLabel}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!userLoading && userData?.role && userData.role !== 'tenant') {
    return null;
  }

  return (
    <AnimatedScreen type="fade">
      <View style={[s.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

        {loading ? (
          <View style={s.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => `${item.kind}-${item.id}`}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <View style={s.emptyStateIcon}>
                  <MaterialIcons name="inbox" size={32} color={theme.colors.textMuted} />
                </View>
                <Text style={s.emptyStateTitle}>{tr.tenant.requestsHubEmpty}</Text>
                <Text style={s.emptyStateText}>
                  {segment === 'pending'
                    ? tr.tenant.noRecordsPending
                    : tr.tenant.noRecordsHistory}
                </Text>
              </View>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
            contentContainerStyle={[s.listContent, filteredItems.length === 0 && { flexGrow: 1 }, { paddingBottom: bottomNavInset }]}
            showsVerticalScrollIndicator={false}
          />
        )}

        <BottomSheetModal
          visible={!!selectedMaintenanceId}
          onClose={() => {
            setSelectedMaintenanceId(null);
            loadData();
          }}
        >
          {selectedMaintenanceId && (
            <MaintenanceDetailView
              requestId={selectedMaintenanceId}
              onClose={() => {
                setSelectedMaintenanceId(null);
                loadData();
              }}
            />
          )}
        </BottomSheetModal>

        <BottomSheetModal
          visible={!!selectedReceiptId}
          onClose={() => {
            setSelectedReceiptId(null);
            loadData();
          }}
        >
          {selectedReceiptId && (
            <ReceiptDetailView
              receiptId={selectedReceiptId}
              onClose={() => {
                setSelectedReceiptId(null);
                loadData();
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
    loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 30,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginTop: 6,
    },
    heroCard: {
      marginHorizontal: 16,
      marginTop: 8,
      padding: 20,
      borderRadius: 26,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.md,
    },
    heroCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    heroIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
      marginBottom: 6,
    },
    heroTitle: {
      fontSize: 21,
      lineHeight: 28,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    heroSubtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    metricRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
    metricCard: {
      flex: 1,
      minHeight: 84,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginTop: 6,
    },
    metricValueSmall: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginTop: 6,
      textAlign: 'center',
    },
    paymentInfoCard: {
      marginTop: 16,
      borderRadius: 20,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    paymentInfoCol: { flex: 1 },
    paymentInfoDivider: { width: 1, backgroundColor: theme.colors.border, marginHorizontal: 14 },
    paymentInfoLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
    },
    paymentInfoValue: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginTop: 6,
    },
    paymentInfoHint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    emptyPropertyCard: {
      marginHorizontal: 16,
      marginTop: 8,
      padding: 24,
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    emptyPropertyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginTop: 12,
    },
    emptyPropertyText: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
    ctaRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16 },
    ctaButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 18,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...theme.shadows.sm,
    },
    ctaPrimary: { backgroundColor: theme.colors.primary },
    ctaSecondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    ctaPrimaryText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textInverse,
    },
    ctaSecondaryText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 18,
      padding: 4,
      backgroundColor: theme.colors.surface2,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    segmentButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    segmentButtonActive: { backgroundColor: theme.colors.surface, ...theme.shadows.sm },
    segmentText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
    segmentTextActive: { color: theme.colors.textPrimary, fontWeight: '700' },
    filterRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
    filterChip: {
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
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterChipText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
    filterChipTextActive: { color: theme.colors.textInverse },
    listContent: { paddingBottom: 120, flexGrow: 1 },
    itemCard: {
      marginHorizontal: 16,
      marginBottom: 14,
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      flexDirection: 'row',
      ...theme.shadows.sm,
    },
    itemAccent: { width: 9 },
    itemBody: { flex: 1, padding: 16 },
    itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    itemIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
    itemSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
    statusChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      marginLeft: 8,
    },
    statusChipText: { fontSize: 11, fontWeight: '700' },
    amountWrap: {
      marginTop: 14,
      paddingHorizontal: 2,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    amountValue: { fontSize: 22, fontWeight: '800', color: theme.colors.primary, flexShrink: 1 },
    amountMeta: { fontSize: 12, color: theme.colors.textMuted },
    metaPanel: {
      marginTop: 14,
      borderRadius: 16,
      padding: 12,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    metaLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    metaValue: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: theme.colors.textPrimary },
    itemNote: { fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary, marginTop: 12 },
    itemFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
    footerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: theme.colors.surface2,
    },
    footerPillText: { fontSize: 12, color: theme.colors.textMuted },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingTop: 32,
    },
    emptyStateIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 14,
    },
    emptyStateTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
    emptyStateText: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
  })
);
