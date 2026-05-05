import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { tr } from '../../app/translations';
import { createThemedStyles, getBadgeStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';
import { listReceipts } from '../../services/appApi';
import { formatCurrency } from '../../utils/propertyHelpers';
import { canReviewReceipt } from '../../utils/employeeAccess';
import AnimatedScreen from './AnimatedScreen';

type ReceiptFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'withdrawn';

const FILTER_LABELS: Record<ReceiptFilter, string> = {
  all: 'Tümü',
  pending: 'Bekleyen',
  approved: 'Onaylı',
  rejected: 'Reddedilen',
  withdrawn: 'Geri Alinan',
};

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

function getActorRoute(role?: string | null) {
  return role === 'employee' ? 'agent' : role || 'tenant';
}

export default function ReceiptsScreen() {
  const { userData, loading: userLoading } = useUserData();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useStyles();
  const badgeStyles = getBadgeStyles(theme);
  const params = useLocalSearchParams<{ openId?: string; openType?: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ReceiptFilter>('pending');
  const [receipts, setReceipts] = useState<any[]>([]);

  const userRole = userData?.role || 'tenant';
  const actorRoute = getActorRoute(userRole);
  const reviewAuthority = canReviewReceipt(userData);

  useEffect(() => {
    if (params.openId && params.openType === 'receipt') {
      router.replace(`/${actorRoute}/receipts/${params.openId}` as any);
    }
  }, [actorRoute, params.openId, params.openType]);

  const loadData = useCallback(async () => {
    if (!userData) {
      return;
    }

    try {
      const response = await listReceipts();

      const nextReceipts = (response.receipts || []).map((item: any) => ({
        ...item,
        property_address: [item.property_address, item.property_city, item.property_district]
          .filter(Boolean)
          .join(', ') || 'Bilinmeyen mülk',
      }));

      setReceipts(nextReceipts);
    } catch (error) {
      console.error('Error loading receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData]);

  useEffect(() => {
    if (!userLoading && userData) {
      loadData();
    }
  }, [loadData, userData, userLoading]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const summary = useMemo(
    () => ({
      approvedTotal: receipts
        .filter((item) => item.status === 'approved')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      pendingCount: receipts.filter((item) => item.status === 'pending').length,
    }),
    [receipts]
  );

  const filteredReceipts = useMemo(() => {
    if (filter === 'all') {
      return receipts;
    }
    return receipts.filter((item) => item.status === filter);
  }, [filter, receipts]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="receipt-long" size={48} color={theme.colors.textMuted} />
      <Text style={styles.emptyTitle}>{tr.receipts.emptyTitle}</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'all'
          ? tr.receipts.emptyAll
          : tr.receipts.emptyFiltered}
      </Text>
    </View>
  );

  const renderReceipt = ({ item }: { item: any }) => {
    const badge = (badgeStyles as any)[item.status] || badgeStyles.pending;
    return (
      <TouchableOpacity
        style={styles.receiptCard}
        activeOpacity={0.88}
        onPress={() => router.push(`/${actorRoute}/receipts/${item.id}` as any)}
      >
        <View style={styles.receiptHeader}>
          <View style={styles.receiptIconBox}>
            <MaterialIcons name="receipt-long" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.receiptHeaderInfo}>
            <Text style={styles.receiptType}>
              {RECEIPT_TYPE_LABELS[item.receipt_type] || 'Odeme'}
            </Text>
            <Text style={styles.receiptMonth}>{item.month || '-'}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: badge.background,
                borderColor: badge.border,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: badge.text }]}>
              {RECEIPT_STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.receiptProperty} numberOfLines={1}>
          {item.property_address}
        </Text>

        <View style={styles.receiptMeta}>
          <Text style={styles.receiptAmount}>{formatCurrency(Number(item.amount || 0))}</Text>
          <Text style={styles.receiptUploader}>{item.uploader_name || 'Sistem'}</Text>
        </View>

        {item.notes ? (
          <Text style={styles.receiptNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            {new Date(item.created_at).toLocaleDateString('tr-TR')}
          </Text>
          <MaterialIcons name="chevron-right" size={18} color={theme.colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AnimatedScreen type="fade">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerBody}>
            <Text style={styles.headerTitle}>{tr.receipts.operationsTitle}</Text>
            <Text style={styles.headerSubtitle}>{tr.receipts.operationsSubtitle}</Text>
          </View>
          {userRole === 'tenant' ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/tenant/upload-receipt' as any)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={22} color={theme.colors.textInverse} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {reviewAuthority && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{tr.receipts.totalApproved.toUpperCase()}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.approvedTotal)}</Text>
            <View style={styles.summaryPill}>
              <MaterialIcons name="hourglass-empty" size={14} color={theme.colors.warningText} />
              <Text style={styles.summaryPillText}>{`${summary.pendingCount} ${tr.receipts.pendingCount}`}</Text>
            </View>
          </View>
        )}

        <View style={styles.filterRow}>
          <FlatList
            data={Object.keys(FILTER_LABELS) as ReceiptFilter[]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, filter === item && styles.filterChipActive]}
                onPress={() => setFilter(item)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === item }}
              >
                <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
                  {FILTER_LABELS[item]}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />
        ) : (
          <FlatList
            data={filteredReceipts}
            renderItem={renderReceipt}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, filteredReceipts.length === 0 && { flex: 1 }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </AnimatedScreen>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 12,
    },
    headerBody: { flex: 1 },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary },
    headerSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    summaryCard: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 22,
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.md,
    },
    summaryLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
    summaryValue: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.primary,
      marginTop: 6,
      marginBottom: 10,
    },
    summaryPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.warningLight,
      marginTop: 2,
    },
    summaryPillText: { fontSize: 12, fontWeight: '600', color: theme.colors.warningText },
    filterRow: { marginTop: 8 },
    filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    filterChip: {
      minHeight: 42,
      paddingHorizontal: 15,
      justifyContent: 'center',
      borderRadius: 21,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterChipText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '700' },
    filterChipTextActive: { color: theme.colors.textInverse, fontWeight: '700' },
    listContent: { padding: 16, paddingBottom: 32 },
    receiptCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    receiptHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    receiptIconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    receiptHeaderInfo: { flex: 1 },
    receiptType: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
    receiptMonth: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '700' },
    receiptProperty: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 6 },
    receiptMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    receiptAmount: { fontSize: 20, fontWeight: '800', color: theme.colors.primary },
    receiptUploader: { fontSize: 12, color: theme.colors.textMuted },
    receiptNotes: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic', marginBottom: 8, lineHeight: 18 },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 10,
    },
    footerText: { fontSize: 12, color: theme.colors.textMuted },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 10,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
    emptySubtitle: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
  })
);
