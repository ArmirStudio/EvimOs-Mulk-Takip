import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated as RNAnimated,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { tr } from '../../app/translations';
import { useUserData } from '../../hooks/useUserData';
import { listReceipts } from '../../services/appApi';
import { createSignedStorageUrl } from '../../services/supabaseStorage';
import { supabase } from '../../services/supabase';
import { formatCurrency } from '../../utils/propertyHelpers';
import { ReceiptDetailView } from './ReceiptDetailView';
import AnimatedScreen from './AnimatedScreen';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type FilterType = 'all' | 'rent' | 'dues' | 'other' | 'approved' | 'pending' | 'rejected' | 'withdrawn';

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

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'rent', label: 'Kira' },
  { key: 'dues', label: 'Aidat' },
  { key: 'other', label: 'Diğer' },
  { key: 'approved', label: 'Onaylı' },
  { key: 'pending', label: 'Bekleyen' },
  { key: 'rejected', label: 'Reddedilen' },
  { key: 'withdrawn', label: 'Geri Alınan' },
];

function BottomSheetModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const bsStyles = useBottomSheetStyles();
  const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      RNAnimated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      RNAnimated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [slideAnim, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={bsStyles.overlay} activeOpacity={1} onPress={onClose} />
      <Animated.View
        style={[
          bsStyles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={bsStyles.handle} />
        {children}
      </Animated.View>
    </Modal>
  );
}

const useBottomSheetStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.modalBackdrop,
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: SCREEN_HEIGHT * 0.9,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
  })
);

function receiptTypeLabel(type: string): string {
  if (type === 'rent') return 'Kira';
  if (type === 'dues') return 'Aidat';
  return 'Diğer';
}

function statusLabel(status: string): string {
  if (status === 'approved') return 'Onaylı';
  if (status === 'pending') return 'Bekleyen';
  if (status === 'rejected') return 'Reddedildi';
  if (status === 'withdrawn') return 'Geri Alındı';
  return status;
}

function statusStyle(theme: ReturnType<typeof useAppTheme>, status: string) {
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

export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useStyles();
  const { userData } = useUserData();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const isLandlord = userData?.role === 'landlord';

  const loadData = useCallback(async () => {
    if (!userData?.id) {
      return;
    }

    setLoading(true);
    try {
      let propertyRows: { id: string; address?: string | null; city?: string | null; district?: string | null }[] = [];
      if (userData.role === 'landlord') {
        const { data } = await supabase
          .from('properties')
          .select('id, address, city, district')
          .eq('landlord_id', userData.id);
        propertyRows = data || [];
      } else if (userData.role === 'tenant') {
        const { data } = await supabase
          .from('properties')
          .select('id, address, city, district')
          .eq('tenant_id', userData.id);
        propertyRows = data || [];
      }

      const propertyIds = propertyRows.map((item) => item.id);
      const propertyLabelMap = new Map(
        propertyRows.map((item) => [
          item.id,
          [item.address, item.city, item.district].filter(Boolean).join(', ') || tr.receipts.unknownProperty,
        ])
      );

      const response = await listReceipts();
      const list = (response.receipts || []).map((item: any) => ({
        ...item,
        property_address: [item.property_address, item.property_city, item.property_district]
          .filter(Boolean)
          .join(', ') || 'Bilinmeyen mülk',
      }));
      setReceipts(list);

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
      console.error('Archive load error:', error);
      setReceipts([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [userData?.id, userData?.role]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      if (activeFilter === 'rent' && receipt.receipt_type !== 'rent') return false;
      if (activeFilter === 'dues' && receipt.receipt_type !== 'dues') return false;
      if (activeFilter === 'other' && receipt.receipt_type !== 'other') return false;
      if (['approved', 'pending', 'rejected', 'withdrawn'].includes(activeFilter) && receipt.status !== activeFilter) {
        return false;
      }

      if (!searchQuery.trim()) {
        return true;
      }

      const query = searchQuery.trim().toLowerCase();
      const propertyAddress = (receipt.property_address || '').toLowerCase();
      const uploaderName = (receipt.uploader_name || '').toLowerCase();
      return propertyAddress.includes(query) || uploaderName.includes(query);
    });
  }, [activeFilter, receipts, searchQuery]);

  const approvedTotal = receipts
    .filter((item) => item.status === 'approved')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingCount = receipts.filter((item) => item.status === 'pending').length;

  const openDocument = async (document: ArchiveDocument) => {
    try {
      const url = await createSignedStorageUrl(
        'property-documents',
        document.storage_path || document.file_url
      );
      if (!url) {
        throw new Error('Document URL is empty');
      }
      await Linking.openURL(url);
    } catch {
      console.error('Document open error');
    }
  };

  const renderItem = ({ item, index }: { item: Receipt; index: number }) => {
    const badge = statusStyle(theme, item.status);
    const dateStr = new Date(item.created_at).toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
    });

    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
        <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => setSelectedReceiptId(item.id)}>
          <View style={styles.cardIconBox}>
            <MaterialIcons name="receipt-long" size={22} color={theme.colors.primary} />
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardRow}>
              <Text style={styles.cardType}>{receiptTypeLabel(item.receipt_type).toUpperCase()} DEKONTU</Text>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{statusLabel(item.status)}</Text>
              </View>
            </View>

            <Text style={styles.cardAddress} numberOfLines={1}>
              {item.property_address || 'Bilinmeyen mülk'}
            </Text>

            <View style={styles.cardRow}>
              {item.amount != null ? <Text style={styles.cardAmount}>{formatCurrency(Number(item.amount))}</Text> : null}
              <Text style={styles.cardDate}>{dateStr}</Text>
            </View>

            {item.uploader_name ? (
              <Text style={styles.cardUploader} numberOfLines={1}>
                Yükleyen: {item.uploader_name}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <>
      {(isLandlord || userData?.role === 'tenant') && (
        <View style={styles.documentSection}>
          <View style={styles.documentSectionHeader}>
            <Text style={styles.documentSectionTitle}>{tr.documents.title}</Text>
            <Text style={styles.documentSectionHint}>
              {userData?.role === 'tenant' ? tr.documents.contract : 'Mülk belgeleri'}
            </Text>
          </View>
          {documents.length === 0 ? (
            <View style={styles.documentEmptyCard}>
              <MaterialIcons name="description" size={22} color={theme.colors.textMuted} />
              <Text style={styles.documentEmptyText}>
                {userData?.role === 'tenant'
                  ? 'Kira sözleşmesi ve diğer belgeler burada görünecek.'
                  : 'Mülklerinize ait belgeler burada görünecek.'}
              </Text>
            </View>
          ) : (
            documents.map((document) => (
              <TouchableOpacity
                key={document.id}
                style={styles.documentCard}
                activeOpacity={0.82}
                onPress={() => void openDocument(document)}
              >
                <View style={styles.documentIcon}>
                  <MaterialIcons name="description" size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.documentTitle} numberOfLines={1}>{document.title}</Text>
                  <Text style={styles.documentMeta} numberOfLines={1}>
                    {documentCategoryLabel(document.category)} • {document.property_label}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {isLandlord && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOPLAM GELIR</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(approvedTotal)}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryPill}>
              <MaterialIcons name="check-circle" size={14} color={theme.colors.successText} />
              <Text style={[styles.summaryPillText, { color: theme.colors.successText }]}>
                {receipts.filter((item) => item.status === 'approved').length} onayli
              </Text>
            </View>
            <View style={[styles.summaryPill, { backgroundColor: theme.colors.warningLight }]}>
              <MaterialIcons name="hourglass-empty" size={14} color={theme.colors.warningText} />
              <Text style={[styles.summaryPillText, { color: theme.colors.warningText }]}>
                {pendingCount} bekleyen
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Mülk veya dekont ara..."
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel="Dekont ara"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Aramayı temizle">
            <MaterialIcons name="close" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === item.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(item.key)}
            accessibilityLabel={`Filtre: ${item.label}`}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === item.key && styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {!loading && <Text style={styles.resultCount}>{filteredReceipts.length} belge</Text>}
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <MaterialIcons name="folder-open" size={56} color={theme.colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Henüz belge yok</Text>
      <Text style={styles.emptySubtitle}>Dekont arşivi bu ekranda listelenecek.</Text>
    </View>
  );

  return (
    <AnimatedScreen type="fade">
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arşiv ve Belgeler</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredReceipts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            filteredReceipts.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

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
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    backBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    headerRight: { width: 44 },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: { paddingBottom: 100 },
    listContentEmpty: { flexGrow: 1 },
    summaryCard: {
      margin: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.dark,
      padding: theme.spacing.xl,
      ...theme.shadows.lg,
    },
    summaryLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textInverse,
      opacity: 0.6,
      letterSpacing: 1.1,
      marginBottom: theme.spacing.xs,
    },
    summaryAmount: {
      fontSize: theme.fontSize.xxxl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.md,
    },
    summaryRow: { flexDirection: 'row', gap: theme.spacing.sm },
    summaryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.successLight,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 4,
    },
    summaryPillText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    documentSection: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      gap: 10,
    },
    documentSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    documentSectionTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    documentSectionHint: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    documentEmptyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      ...theme.shadows.sm,
    },
    documentEmptyText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    documentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...theme.shadows.sm,
    },
    documentIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    documentTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    documentMeta: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      ...theme.shadows.sm,
    },
    searchIcon: { marginRight: theme.spacing.sm },
    searchInput: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
    },
    filterRow: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    filterChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.primary,
    },
    filterChipText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    filterChipTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.semibold,
    },
    resultCount: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textMuted,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...theme.shadows.sm,
    },
    cardIconBox: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
      flexShrink: 0,
    },
    cardContent: { flex: 1, gap: 3 },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardType: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      letterSpacing: 0.6,
      flexShrink: 1,
      marginRight: theme.spacing.sm,
    },
    badge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.round,
      flexShrink: 0,
    },
    badgeText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold },
    cardAddress: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    cardAmount: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    cardDate: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textMuted,
    },
    cardUploader: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xxxl,
      paddingTop: theme.spacing.xxxl * 2,
    },
    emptyIconBox: {
      width: 96,
      height: 96,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xl,
    },
    emptyTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    emptySubtitle: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  })
);
