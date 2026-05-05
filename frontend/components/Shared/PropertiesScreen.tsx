import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Pressable, Image, ScrollView, RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { PROPERTY_IMAGES, formatRentDay, formatCurrency } from '../../utils/propertyHelpers';
import { useUserData } from '../../hooks/useUserData';
import ShimmerPlaceholder from './ShimmerPlaceholder';
import AnimatedHeaderFlatList from './AnimatedHeaderFlatList';
import AnimatedScreen from './AnimatedScreen';
import { canManageOfficeRecords, getOfficeOwnerId, hasFullEmployeeAccess } from '../../utils/employeeAccess';

type FilterType = 'all' | 'occupied' | 'vacant' | 'maintenance';
type SortType = 'newest' | 'price_asc' | 'price_desc' | 'alphabetical';

const SORT_OPTIONS: { key: SortType; label: string; icon: string }[] = [
  { key: 'newest', label: 'Yeni Eklenen', icon: 'schedule' },
  { key: 'price_asc', label: 'Kira ↑ (Düşükten)', icon: 'trending-up' },
  { key: 'price_desc', label: 'Kira ↓ (Yüksekten)', icon: 'trending-down' },
  { key: 'alphabetical', label: 'Alfabetik', icon: 'sort-by-alpha' },
];

const ROLE_TITLE: Record<string, string> = {
  agent: 'Portföyüm',
  employee: 'Portföyüm',
  landlord: 'Mülklerim',
  tenant: 'Evim',
};

function getStatusMeta(theme: ReturnType<typeof useAppTheme>, status: string): { label: string; color: string; bg: string; icon: string } {
  const statusMeta: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    occupied: { label: 'KİRADA', color: theme.colors.info, bg: theme.colors.info, icon: 'person' },
    vacant: { label: 'BOŞ', color: theme.colors.success, bg: theme.colors.success, icon: 'check-circle' },
    maintenance: { label: 'BAKIMDA', color: theme.colors.warning, bg: theme.colors.warning, icon: 'build' },
  };
  return statusMeta[status] ?? statusMeta.vacant;
}

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: 'Tümü', icon: 'apps' },
  { key: 'occupied', label: 'Kirada', icon: 'person' },
  { key: 'vacant', label: 'Boş', icon: 'check-circle-outline' },
  { key: 'maintenance', label: 'Bakımda', icon: 'build' },
];

function parseRoomType(description: string | null | undefined): string {
  if (!description) return '—';
  const match = description.match(/\d+\+\d+/);
  return match ? match[0] : '—';
}

export default function PropertiesScreen() {
  const { userData, loading: userLoading } = useUserData();
  const theme = useAppTheme();
  const s = useStyles();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showSortModal, setShowSortModal] = useState(false);

  const userRole = userData?.role || 'tenant';
  const canEditProperties = canManageOfficeRecords(userData);
  const officeOwnerId = getOfficeOwnerId(userData);

  const loadProperties = useCallback(async () => {
    if (!userData) return;
    try {
      let query = supabase
        .from('properties')
        .select(`
          *,
          landlord:users!properties_landlord_id_fkey(id, full_name, email, phone),
          tenant:users!properties_tenant_id_fkey(id, full_name, email, phone),
          agent:users!properties_agent_id_fkey(id, full_name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'landlord') {
        query = query.eq('landlord_id', userData.id);
      } else if (userRole === 'tenant') {
        query = query.eq('tenant_id', userData.id);
      } else if (userRole === 'employee') {
        query = hasFullEmployeeAccess(userData)
          ? query.eq('agent_id', officeOwnerId || userData.id)
          : query.eq('employee_id', userData.id);
      } else if (userRole === 'agent') {
        query = query.eq('agent_id', userData.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [officeOwnerId, userData, userRole]);

  useEffect(() => {
    if (!userLoading && userData?.id) loadProperties();
  }, [loadProperties, userLoading, userData?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!userLoading && userData?.id) loadProperties();
    }, [loadProperties, userLoading, userData?.id])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadProperties();
  };

  const displayProperties = useMemo(() => {
    let list = properties.filter(
      p => activeFilter === 'all' || p.status === activeFilter
    );
    switch (sortBy) {
      case 'price_asc':
        list = [...list].sort((a, b) => ((a.monthly_rent || a.rent_amount || 0) - (b.monthly_rent || b.rent_amount || 0)));
        break;
      case 'price_desc':
        list = [...list].sort((a, b) => ((b.monthly_rent || b.rent_amount || 0) - (a.monthly_rent || a.rent_amount || 0)));
        break;
      case 'alphabetical':
        list = [...list].sort((a, b) =>
          (a.address || '').localeCompare(b.address || '', 'tr')
        );
        break;
      default:
        list = [...list].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
    return list;
  }, [properties, activeFilter, sortBy]);

  const renderProperty = ({ item, index }: { item: any; index: number }) => {
    const status = item.status || 'vacant';
    const meta = getStatusMeta(theme, status);
    const isOccupied = status === 'occupied';
    const tenantName = item.tenant?.full_name || item.tenant_name || null;
    const roomType = item.room_type || parseRoomType(item.description);
    const area = item.area || null;
    const imageUri = item.images?.[0] || PROPERTY_IMAGES[index % PROPERTY_IMAGES.length];

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(400).springify()}>
        <TouchableOpacity
          style={s.card}
          onPress={() => router.push(`/${userRole}/property-detail?id=${item.id}` as any)}
          activeOpacity={0.93}
        >
          {/* ── Görsel ── */}
          <View style={s.imageWrap}>
            <Image source={{ uri: imageUri }} style={s.image} resizeMode="cover" />

            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', theme.colors.modalBackdrop]}
              style={s.imageGradient}
            />

            {/* Status badge — sol üst */}
            <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
              <MaterialIcons name={meta.icon as any} size={11} color={theme.colors.white} />
              <Text style={s.statusBadgeText}>{meta.label}</Text>
            </View>

            {/* Fiyat — sağ üst float */}
            <View style={s.priceFloat}>
              <Text style={s.priceFloatAmount}>{formatCurrency(item.monthly_rent)}</Text>
              <Text style={s.priceFloatUnit}>/ay</Text>
            </View>

            {/* Alt gradient üzerinde isim */}
            <View style={s.imageFooter}>
              <Text style={s.imageTitle} numberOfLines={1}>
                {item.description || item.address || 'Mülk'}
              </Text>
              <View style={s.imageLocation}>
                <MaterialIcons name="location-on" size={12} color={theme.colors.white} />
                <Text style={s.imageLocationText}>
                  {[item.city, item.district].filter(Boolean).join(' / ') || '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── İçerik ── */}
          <View style={s.content}>
            {/* Özellik chip'leri */}
            <View style={s.chipRow}>
              {area ? (
                <View style={s.chip}>
                  <MaterialIcons name="square-foot" size={13} color={theme.colors.textMuted} />
                  <Text style={s.chipText}>{area} m²</Text>
                </View>
              ) : null}
              {roomType !== '—' ? (
                <View style={s.chip}>
                  <MaterialIcons name="king-bed" size={13} color={theme.colors.textMuted} />
                  <Text style={s.chipText}>{roomType}</Text>
                </View>
              ) : null}
              {isOccupied && item.rent_day ? (
                <View style={[s.chip, s.chipHighlight]}>
                  <MaterialIcons name="calendar-today" size={13} color={theme.colors.primary} />
                  <Text style={[s.chipText, { color: theme.colors.primary }]}>
                    {formatRentDay(item.rent_day)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Kiracı / Durum satırı */}
            <View style={s.footerRow}>
              <View style={s.tenantRow}>
                <View style={[s.tenantAvatar, !isOccupied && s.tenantAvatarEmpty]}>
                  <MaterialIcons
                    name={isOccupied ? 'person' : 'person-add'}
                    size={16}
                    color={isOccupied ? theme.colors.primary : theme.colors.textMuted}
                  />
                </View>
                <Text style={[s.tenantName, !isOccupied && s.tenantNameEmpty]} numberOfLines={1}>
                  {isOccupied
                    ? (tenantName || 'Kiracı mevcut')
                    : status === 'maintenance'
                      ? 'Bakım devam ediyor'
                      : 'Kiracı aranıyor'}
                </Text>
              </View>

              <View style={s.actionRow}>
                {canEditProperties && (
                  <TouchableOpacity
                    style={s.editBtn}
                    onPress={() => router.push(`/agent/edit-property?id=${item.id}` as any)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="edit" size={15} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={s.detailBtn}
                  onPress={() => router.push(`/${userRole}/property-detail?id=${item.id}` as any)}
                >
                  <Text style={s.detailBtnText}>Detay</Text>
                  <MaterialIcons name="chevron-right" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (userLoading) return null;

  return (
    <AnimatedScreen type="fade">
      <View style={s.container}>
        <AnimatedHeaderFlatList
          headerHeight={110}
          glassHeader
          headerContent={
            <View style={{ width: '100%' }}>
              <View style={s.headerTop}>
                <Text style={s.headerTitle}>{ROLE_TITLE[userRole] ?? 'Mülkler'}</Text>
                <View style={s.headerRight}>
                  <TouchableOpacity style={s.iconBtn} onPress={() => setShowSortModal(true)}>
                    <MaterialIcons name="sort" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  {canEditProperties && (
                    <TouchableOpacity
                      style={s.addBtn}
                      onPress={() => router.push('/agent/create-property')}
                    >
                      <MaterialIcons name="add" size={22} color={theme.colors.textInverse} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Filter chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterScroll}
              >
                {FILTERS.map(f => {
                  const count = f.key === 'all'
                    ? properties.length
                    : properties.filter(p => p.status === f.key).length;
                  const active = activeFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[s.filterChip, active && s.filterChipActive]}
                      onPress={() => setActiveFilter(f.key)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons
                        name={f.icon as any}
                        size={13}
                        color={active ? theme.colors.textInverse : theme.colors.textSecondary}
                      />
                      <Text style={[s.filterText, active && s.filterTextActive]}>
                        {f.label}
                      </Text>
                      {count > 0 && (
                        <View style={[s.filterCount, active && s.filterCountActive]}>
                          <Text style={[s.filterCountText, active && s.filterCountTextActive]}>
                            {count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          data={displayProperties}
          renderItem={renderProperty}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            loading ? (
              <View style={{ gap: 16 }}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={s.card}>
                    <ShimmerPlaceholder width="100%" height={200} borderRadius={0} />
                    <View style={{ padding: 16, gap: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ShimmerPlaceholder height={28} width={70} borderRadius={14} />
                        <ShimmerPlaceholder height={28} width={60} borderRadius={14} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <ShimmerPlaceholder height={30} width={30} borderRadius={15} />
                          <ShimmerPlaceholder height={16} width={120} borderRadius={4} />
                        </View>
                        <ShimmerPlaceholder height={32} width={70} borderRadius={16} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <Animated.View entering={FadeIn.duration(400)} style={s.emptyContainer}>
                <View style={s.emptyIconWrap}>
                  <MaterialIcons name="apartment" size={44} color={theme.colors.textMuted} />
                </View>
                <Text style={s.emptyTitle}>Mülk bulunamadı</Text>
                <Text style={s.emptySubtitle}>
                  {activeFilter !== 'all'
                    ? 'Bu filtrede sonuç yok, filtre değiştirmeyi deneyin'
                    : 'Henüz portföye mülk eklenmemiş'}
                </Text>
                {canEditProperties && activeFilter === 'all' && (
                  <TouchableOpacity
                    style={s.emptyAction}
                    onPress={() => router.push('/agent/create-property')}
                  >
                    <MaterialIcons name="add" size={18} color={theme.colors.textInverse} />
                    <Text style={s.emptyActionText}>İlk Mülkü Ekle</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            ) : null
          }
        />

        {/* Sort Modal */}
        <Modal
          visible={showSortModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSortModal(false)}
        >
          <Pressable style={s.modalOverlay} onPress={() => setShowSortModal(false)}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>Sıralama</Text>
              {SORT_OPTIONS.map(opt => {
                const active = sortBy === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.sortRow, active && s.sortRowActive]}
                    onPress={() => { setSortBy(opt.key); setShowSortModal(false); }}
                  >
                    <View style={[s.sortIconWrap, active && s.sortIconWrapActive]}>
                      <MaterialIcons
                        name={opt.icon as any}
                        size={18}
                        color={active ? theme.colors.primary : theme.colors.textMuted}
                      />
                    </View>
                    <Text style={[s.sortLabel, active && s.sortLabelActive]}>
                      {opt.label}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      </View>
    </AnimatedScreen>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  // Header
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.sm,
  },

  // Filters
  filterScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 34, paddingHorizontal: 12, borderRadius: 17,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.textInverse },
  filterCount: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountActive: { backgroundColor: theme.colors.overlaySoft },
  filterCountText: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted },
  filterCountTextActive: { color: theme.colors.textInverse },

  // List
  listContent: { padding: 16, paddingBottom: 110, gap: 16 },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },

  // Image
  imageWrap: { width: '100%', aspectRatio: 4 / 3, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
  },
  statusBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: { color: theme.colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  priceFloat: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'baseline', gap: 2,
    backgroundColor: theme.colors.navGlass,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12,
    ...theme.shadows.sm,
  },
  priceFloatAmount: { fontSize: 16, fontWeight: '900', color: theme.colors.primary },
  priceFloatUnit: { fontSize: 11, fontWeight: '500', color: theme.colors.textMuted },
  imageFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 14, paddingBottom: 12, paddingTop: 20,
  },
  imageTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.white, marginBottom: 2 },
  imageLocation: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  imageLocationText: { fontSize: 12, color: theme.colors.white, fontWeight: '500', opacity: 0.85 },

  // Content
  content: { padding: 14, gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  chipHighlight: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1, borderColor: `${theme.colors.primary}30`,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },

  // Footer row
  footerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  tenantAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  tenantAvatarEmpty: { backgroundColor: theme.colors.surface2 },
  tenantName: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, flex: 1 },
  tenantNameEmpty: { color: theme.colors.textMuted, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  detailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 16,
  },
  detailBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },

  // Empty
  emptyContainer: {
    alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14, color: theme.colors.textMuted,
    textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 14, ...theme.shadows.sm,
  },
  emptyActionText: { fontSize: 15, fontWeight: '700', color: theme.colors.textInverse },

  // Sort Modal
  modalOverlay: {
    flex: 1, backgroundColor: theme.colors.modalBackdrop,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 16 },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  sortRowActive: { backgroundColor: theme.colors.primaryLight, marginHorizontal: -24, paddingHorizontal: 24 },
  sortIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  sortIconWrapActive: { backgroundColor: `${theme.colors.primary}20` },
  sortLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary },
  sortLabelActive: { fontWeight: '700', color: theme.colors.primary },
}));
