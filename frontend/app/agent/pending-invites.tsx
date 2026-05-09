import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { createThemedStyles, useAppTheme } from '../theme';
import { listPendingInvites, type InviteRole, type PendingInviteUser } from '../../services/appApi';
import { getUserData, type UserData } from '../../hooks/useUserData';

type Filter = 'all' | InviteRole;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'tenant', label: 'Kiracılar' },
  { key: 'landlord', label: 'Ev Sahipleri' },
  { key: 'employee', label: 'Çalışanlar' },
];

function getRoleLabel(role: InviteRole) {
  if (role === 'landlord') return 'Ev Sahibi';
  if (role === 'employee') return 'Çalışan';
  return 'Kiracı';
}

export default function PendingInvitesScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<PendingInviteUser[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const user = await getUserData();
      setCurrentUser(user);
      const response = await listPendingInvites({ role: filter });
      setItems(response.pending || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const canSeeContactLabel = currentUser?.role === 'agent';
  const data = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return items;
    return items.filter((item) => {
      const label = canSeeContactLabel ? item.invites?.contact_label || '' : '';
      return (
        (item.full_name || '').toLocaleLowerCase('tr-TR').includes(query) ||
        (item.email || '').toLocaleLowerCase('tr-TR').includes(query) ||
        label.toLocaleLowerCase('tr-TR').includes(query)
      );
    });
  }, [canSeeContactLabel, items, searchQuery]);

  const renderItem = ({ item }: { item: PendingInviteUser }) => {
    const invite = item.invites;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/agent/pending-invite-detail?id=${item.id}` as never)}
        activeOpacity={0.84}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.full_name || '?').slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.full_name || 'Profil adı yok'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{getRoleLabel(item.role)}</Text>
            </View>
          </View>
          {canSeeContactLabel ? (
            <Text style={styles.meta} numberOfLines={1}>{invite?.contact_label || 'Rehber adı yok'}</Text>
          ) : null}
          <Text style={styles.meta} numberOfLines={1}>{item.email}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Onay Bekleyenler</Text>
        <TouchableOpacity onPress={() => router.push('/agent/invite' as never)} style={styles.iconButton}>
          <MaterialIcons name="person-add" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={canSeeContactLabel ? 'Profil adı veya takma ad ara' : 'Profil adı ara'}
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={data.length ? styles.listContent : styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="pending-actions" size={42} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>Bekleyen davet yok</Text>
              <Text style={styles.emptyBody}>Yeni kayıt olan davetliler burada onay için görünür.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
    iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.navGlass, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    filterRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md, flexWrap: 'wrap' },
    filterChip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: 999, backgroundColor: theme.colors.navGlass, borderWidth: 1, borderColor: theme.colors.border },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterText: { color: theme.colors.textSecondary, fontWeight: theme.fontWeight.semibold },
    filterTextActive: { color: theme.colors.textInverse },
    searchWrap: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      minHeight: 48,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.navGlass,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    searchInput: { flex: 1, minHeight: 48, color: theme.colors.textPrimary, fontSize: theme.fontSize.md },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: theme.spacing.lg, paddingBottom: 120 },
    emptyContent: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.xl },
    card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.navGlass, borderRadius: theme.borderRadius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md, marginBottom: theme.spacing.md, ...theme.shadows.sm },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    avatarText: { color: theme.colors.primary, fontWeight: theme.fontWeight.bold },
    cardBody: { flex: 1, gap: 3 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    name: { flex: 1, fontSize: theme.fontSize.base, color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
    roleBadge: { borderRadius: 999, paddingHorizontal: theme.spacing.sm, paddingVertical: 3, backgroundColor: theme.colors.surface2 },
    roleBadgeText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, fontWeight: theme.fontWeight.bold },
    meta: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
    empty: { alignItems: 'center', gap: theme.spacing.sm },
    emptyTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    emptyBody: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center' },
  })
);
