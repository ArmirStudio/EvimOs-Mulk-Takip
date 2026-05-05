import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tr } from '../../app/translations';
import { listUsers } from '../../services/appApi';
import { getUserData, type UserData } from '../../hooks/useUserData';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { canManageOfficeRecords, canViewOfficeDirectory } from '../../utils/employeeAccess';

type UserRole = 'tenant' | 'landlord';

interface Props {
  role: UserRole;
}

const CONFIG: Record<UserRole, {
  headerTitle: string;
  createRoute: string;
  emptyText: string;
  emptySub: string;
  emptyButtonText: string;
  emptyIcon: keyof typeof Ionicons.glyphMap;
}> = {
  tenant: {
    headerTitle: tr.users.tenant,
    createRoute: '/agent/create-user?type=tenant',
    emptyText: tr.properties.noTenants,
    emptySub: tr.users.noTenantsSub,
    emptyButtonText: tr.users.addTenant,
    emptyIcon: 'person-outline',
  },
  landlord: {
    headerTitle: tr.users.landlord,
    createRoute: '/agent/create-user?type=landlord',
    emptyText: tr.users.noLandlords,
    emptySub: tr.users.noLandlordsSub,
    emptyButtonText: tr.users.addLandlord,
    emptyIcon: 'people-outline',
  },
};

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      backgroundColor: theme.colors.primary,
    },
    backButton: { padding: theme.spacing.xs },
    addButton: { padding: theme.spacing.xs },
    headerTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyIcon: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: theme.colors.surface2,
      justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    emptyText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: 4 },
    emptySubtext: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginBottom: 24 },
    emptyButton: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
      paddingVertical: 12, paddingHorizontal: 20, gap: 8,
    },
    emptyButtonText: { color: theme.colors.textInverse, fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.semibold },
    listContent: { padding: theme.spacing.lg },
    searchWrap: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      minHeight: 48,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    searchInput: {
      flex: 1,
      minHeight: 48,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.md,
    },
    userCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg, marginBottom: 12,
      borderWidth: 1, borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    userIcon: {
      width: 48, height: 48, borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    userInfo: { flex: 1 },
    userName: { fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: 2 },
    contactLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: 4 },
    userUsername: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: 4 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    userPhone: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
    propertyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    propertyDot: { width: 6, height: 6, borderRadius: 3 },
    propertyText: { fontSize: theme.fontSize.xs, color: theme.colors.successText, fontWeight: theme.fontWeight.medium },
  })
);

export default function UserListScreen({ role }: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);
  const [currentUser, setCurrentUser] = React.useState<UserData | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const cfg = CONFIG[role];
  const canCreateUsers = canManageOfficeRecords(currentUser);
  const canViewDirectory = canViewOfficeDirectory(currentUser);

  const loadUsers = useCallback(async () => {
    try {
      const nextUser = await getUserData();
      setCurrentUser(nextUser);
      if (!canViewOfficeDirectory(nextUser)) {
        setUsers([]);
        return;
      }
      const response = await listUsers({ role });
      setUsers(response.users || []);
    } catch {
      Alert.alert(tr.common.error, tr.errors.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const getContactLabel = React.useCallback((item: any) => {
    const invite = Array.isArray(item.invites) ? item.invites[0] : item.invites;
    return currentUser?.role === 'agent' ? invite?.contact_label || '' : '';
  }, [currentUser?.role]);

  const filteredUsers = React.useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return users;
    return users.filter((item) => {
      const label = getContactLabel(item);
      return (
        (item.full_name || '').toLocaleLowerCase('tr-TR').includes(query) ||
        (item.email || '').toLocaleLowerCase('tr-TR').includes(query) ||
        (item.phone || '').toLocaleLowerCase('tr-TR').includes(query) ||
        label.toLocaleLowerCase('tr-TR').includes(query)
      );
    });
  }, [getContactLabel, searchQuery, users]);

  const renderUser = ({ item }: { item: any }) => {
    const contactLabel = getContactLabel(item);
    return (
      <TouchableOpacity
        style={styles.userCard}
        activeOpacity={0.85}
        onPress={() => router.push(`/agent/contact-detail?id=${item.id}` as any)}
      >
        <View style={styles.userIcon}>
          <Ionicons name="person" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name}</Text>
          {!!contactLabel && <Text style={styles.contactLabel}>Takma ad: {contactLabel}</Text>}
          <Text style={styles.userUsername}>{item.email}</Text>
          {item.phone && (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.userPhone}>{item.phone}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{cfg.headerTitle}</Text>
        {canCreateUsers ? (
          <TouchableOpacity onPress={() => router.push(cfg.createRoute as any)} style={styles.addButton}>
            <Ionicons name="add" size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
        ) : (
          <View style={styles.addButton} />
        )}
      </View>

      {!canViewDirectory ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="lock-closed-outline" size={48} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyText}>Erisim yok</Text>
          <Text style={styles.emptySubtext}>Bu rehber sadece agent ve tam yetkili employee icin acik.</Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name={cfg.emptyIcon} size={48} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyText}>{cfg.emptyText}</Text>
          <Text style={styles.emptySubtext}>{cfg.emptySub}</Text>
          {canCreateUsers && (
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push(cfg.createRoute as any)}>
              <Ionicons name="add" size={20} color={theme.colors.textInverse} />
              <Text style={styles.emptyButtonText}>{cfg.emptyButtonText}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={currentUser?.role === 'agent' ? 'Profil adi veya takma ad ara' : 'Profil adi ara'}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <FlatList
            data={filteredUsers}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}
