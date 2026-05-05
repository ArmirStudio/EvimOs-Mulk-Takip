import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../theme';
import { listAdminStructures } from '../../services/appApi';
import { resolveSupabaseStorageUrl } from '../../services/supabaseStorage';

type AgencySource = 'agency' | 'standalone_agent';
type FilterMode = 'all' | AgencySource;

interface AgencyCardModel {
  id: string;
  name: string;
  location: string;
  logo_url: string | null;
  banner_url: string | null;
  brand_color_primary: string;
  subscription_plan: string;
  status: string;
  active_regions: string[];
  source: AgencySource;
  entity_type?: 'office' | 'company';
  email?: string;
  phone?: string;
}

const FILTERS: { key: FilterMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'Tümü', icon: 'grid-outline' },
  { key: 'agency', label: 'Yapilar', icon: 'business-outline' },
  { key: 'standalone_agent', label: 'Bağımsız', icon: 'person-outline' },
];

export default function CompaniesScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const [items, setItems] = useState<AgencyCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listAdminStructures();
      const mappedItems: AgencyCardModel[] = (response.items || []).map((item: any) => {
        if (item.source === 'standalone_agent') {
          return {
            id: item.id,
            name: item.name,
            location: item.location || '',
            logo_url: resolveSupabaseStorageUrl('avatars', item.logo_url),
            banner_url: null,
            brand_color_primary: item.brand_color_primary || theme.colors.primary,
            subscription_plan: item.subscription_plan || 'free',
            status: item.status || 'active',
            active_regions: item.active_regions || [],
            source: 'standalone_agent',
            email: item.email,
            phone: item.phone || undefined,
          };
        }

        return {
          ...item,
          logo_url: resolveSupabaseStorageUrl('agency-branding', item.logo_url),
          banner_url: resolveSupabaseStorageUrl('agency-branding', item.banner_url),
          source: 'agency',
        };
      });

      setItems(mappedItems);
    } catch (error) {
      console.error('Fetch agencies error:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [theme.colors.primary]);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== 'all' && item.source !== filter) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return [item.name, item.location, item.email, item.phone, ...(item.active_regions || [])]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized));
    });
  }, [filter, items, query]);

  const summary = useMemo(() => {
    const offices = items.filter((item) => item.source === 'agency' && item.entity_type !== 'company').length;
    const companies = items.filter((item) => item.source === 'agency' && item.entity_type === 'company').length;
    const standalone = items.filter((item) => item.source === 'standalone_agent').length;
    return { offices, companies, standalone };
  }, [items]);

  const getTypeLabel = (item: AgencyCardModel) => {
    if (item.source === 'standalone_agent') {
      return 'Bağımsız Emlakçı';
    }
    return item.entity_type === 'company' ? 'Şirket' : 'Ofis';
  };

  const handleCardPress = (item: AgencyCardModel) => {
    if (item.source === 'agency') {
      router.push(`/admin/edit-company?id=${item.id}`);
      return;
    }
    router.push(`/admin/edit-agent?id=${item.id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchItems} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <Text style={styles.title}>Şirketler ve Ofisler</Text>
          <Text style={styles.subtitle}>
            Ofis, şirket ve bağımsız emlakçı kayıtlarını tek listede yönet.
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateSheet(true)} activeOpacity={0.9}>
            <Ionicons name="add" size={18} color={theme.colors.textInverse} />
            <Text style={styles.addButtonText}>Yeni Kayıt</Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <StatPill value={summary.offices} label="Ofis" />
            <StatPill value={summary.companies} label="Şirket" />
            <StatPill value={summary.standalone} label="Bağımsız" />
          </View>
        </View>

        <View style={styles.controlsCard}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Yapi, bolge veya iletisim ara"
              placeholderTextColor={theme.colors.textMuted}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((option) => {
              const active = filter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(option.key)}
                >
                  <Ionicons
                    name={option.icon}
                    size={15}
                    color={active ? theme.colors.textInverse : theme.colors.textSecondary}
                  />
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card} onPress={() => handleCardPress(item)} activeOpacity={0.9}>
              <View style={styles.mediaArea}>
                {item.banner_url ? (
                  <Image source={{ uri: item.banner_url }} style={styles.bannerImage} />
                ) : (
                  <View style={[styles.bannerPlaceholder, { backgroundColor: item.brand_color_primary || theme.colors.primary }]} />
                )}
                <View style={styles.bannerOverlay} />

                <View style={styles.cardTopRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{getTypeLabel(item)}</Text>
                  </View>
                  <Ionicons name="pencil" size={15} color={theme.colors.textInverse} />
                </View>

                <View style={styles.identityRow}>
                  {item.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.logo} />
                  ) : (
                    <View style={[styles.logoPlaceholder, { backgroundColor: item.brand_color_primary || theme.colors.primary }]}>
                      <Text style={styles.logoText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.identityInfo}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.location} numberOfLines={1}>
                      {item.location || item.email || 'Konum belirtilmedi'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBody}>
                {item.active_regions.length > 0 ? (
                  <View style={styles.regionsRow}>
                    {item.active_regions.slice(0, 4).map((region) => (
                      <Text key={`${item.id}-${region}`} style={styles.regionTag}>{region}</Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyMeta}>Etkin bolge bilgisi eklenmemis</Text>
                )}

                {(item.email || item.phone) ? (
                  <View style={styles.contactRow}>
                    {item.email ? <Text style={styles.contactText}>{item.email}</Text> : null}
                    {item.phone ? <Text style={styles.contactText}>{item.phone}</Text> : null}
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={52} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Kayıt bulunamadı</Text>
            <Text style={styles.emptyText}>
              {query ? 'Arama kriterlerine uygun sonuç bulunamadı.' : 'Henüz kayıt bulunmuyor.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showCreateSheet} transparent animationType="fade" onRequestClose={() => setShowCreateSheet(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetScrim} onPress={() => setShowCreateSheet(false)} />
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Yeni Kayıt Seç</Text>
            <Text style={styles.sheetSubtitle}>İstediğin akışa doğrudan buradan geç.</Text>

            <SheetOption
              icon="home-outline"
              title="Emlak Ofisi"
              description="Kucuk ekipli lokal ofis yapisi."
              onPress={() => {
                setShowCreateSheet(false);
                router.push('/admin/create-company?entityType=office');
              }}
            />
            <SheetOption
              icon="business-outline"
              title="Emlak Şirketi"
              description="Kurumsal ve çok çalışanlı yapı."
              onPress={() => {
                setShowCreateSheet(false);
                router.push('/admin/create-company?entityType=company');
              }}
            />
            <SheetOption
              icon="person-outline"
              title="Bağımsız Emlakçı"
              description="Ofise bağlı olmayan bireysel kayıt."
              onPress={() => {
                setShowCreateSheet(false);
                router.push('/admin/create-agent' as any);
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatPill({ value, label }: { value: number; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SheetOption({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <TouchableOpacity style={styles.sheetOption} onPress={onPress}>
      <Ionicons name={icon} size={18} color={theme.colors.primary} />
      <View style={styles.sheetCopy}>
        <Text style={styles.sheetOptionTitle}>{title}</Text>
        <Text style={styles.sheetOptionText}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { padding: theme.spacing.md, paddingBottom: 100, gap: theme.spacing.md },
    heroCard: { backgroundColor: theme.colors.dark, borderRadius: theme.borderRadius.xl, padding: theme.spacing.lg, overflow: 'hidden' },
    heroGlow: { position: 'absolute', top: -44, right: -12, width: 180, height: 180, borderRadius: 90, backgroundColor: theme.colors.primary, opacity: 0.18 },
    title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    subtitle: { marginTop: theme.spacing.xs, fontSize: theme.fontSize.sm, color: 'rgba(255,252,248,0.74)', lineHeight: 20 },
    addButton: { alignSelf: 'flex-start', marginTop: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
    addButtonText: { color: theme.colors.textInverse, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold },
    statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
    statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: theme.borderRadius.lg, paddingVertical: theme.spacing.md, alignItems: 'center' },
    statValue: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    statLabel: { marginTop: 4, fontSize: theme.fontSize.xs, color: 'rgba(255,252,248,0.72)' },
    controlsCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm },
    searchInput: { flex: 1, paddingVertical: theme.spacing.sm, fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
    filterRow: { paddingTop: theme.spacing.md, gap: theme.spacing.sm },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.round, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.background },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary },
    filterTextActive: { color: theme.colors.textInverse },
    card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
    mediaArea: { height: 176, justifyContent: 'space-between', padding: theme.spacing.md },
    bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    bannerPlaceholder: { ...StyleSheet.absoluteFillObject },
    bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(32,19,12,0.36)' },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    typeBadge: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: theme.borderRadius.round, paddingHorizontal: theme.spacing.sm, paddingVertical: 6 },
    typeBadgeText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold, color: theme.colors.textInverse },
    identityRow: { flexDirection: 'row', alignItems: 'flex-end' },
    logo: { width: 72, height: 72, borderRadius: 24, borderWidth: 3, borderColor: theme.colors.surface },
    logoPlaceholder: { width: 72, height: 72, borderRadius: 24, borderWidth: 3, borderColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    identityInfo: { flex: 1, marginLeft: theme.spacing.md, paddingBottom: 6 },
    name: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    location: { marginTop: 4, fontSize: theme.fontSize.sm, color: 'rgba(255,252,248,0.76)' },
    cardBody: { padding: theme.spacing.md, gap: theme.spacing.sm },
    regionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
    regionTag: { backgroundColor: theme.colors.surface2, color: theme.colors.textSecondary, fontSize: theme.fontSize.xs, paddingHorizontal: theme.spacing.sm, paddingVertical: 5, borderRadius: theme.borderRadius.round },
    emptyMeta: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
    contactRow: { gap: 2 },
    contactText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
    emptyState: { alignItems: 'center', paddingVertical: 56, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, borderWidth: 1, borderColor: theme.colors.border },
    emptyTitle: { marginTop: theme.spacing.md, fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    emptyText: { marginTop: theme.spacing.xs, paddingHorizontal: theme.spacing.xl, textAlign: 'center', fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 20 },
    sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)', padding: theme.spacing.md },
    sheetScrim: { ...StyleSheet.absoluteFillObject },
    sheetCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
    sheetTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    sheetSubtitle: { marginTop: theme.spacing.xs, marginBottom: theme.spacing.md, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
    sheetOption: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start', paddingVertical: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
    sheetCopy: { flex: 1 },
    sheetOptionTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
    sheetOptionText: { marginTop: 2, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  })
);
