import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';
import { supabase } from '../../services/supabase';
import AnimatedScreen from './AnimatedScreen';

type TenantRow = {
  property_id: string;
  property_label: string;
  contract_start?: string | null;
  contract_end?: string | null;
  tenant: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) {
    return 'Belirtilmedi';
  }

  return new Date(value).toLocaleDateString('tr-TR');
}

export default function LandlordTenantsScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { userData } = useUserData();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<TenantRow[]>([]);

  const loadTenants = useCallback(async () => {
    if (!userData?.id) {
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          city,
          district,
          contract_start,
          contract_end,
          tenant:users!tenant_id(
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('landlord_id', userData.id)
        .not('tenant_id', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      const mapped = ((data as any[]) || []).map((item) => ({
        property_id: item.id,
        property_label: [item.address, item.district, item.city].filter(Boolean).join(', ') || 'Bilinmeyen mülk',
        contract_start: item.contract_start,
        contract_end: item.contract_end,
        tenant: Array.isArray(item.tenant) ? item.tenant[0] || null : item.tenant || null,
      })) as TenantRow[];

      setRows(mapped.filter((item) => !!item.tenant));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadTenants();
    }, [loadTenants])
  );

  const tenantCount = useMemo(() => rows.length, [rows.length]);

  return (
    <AnimatedScreen type="fade">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Kiracilar</Text>
            <Text style={styles.headerSubtitle}>Mulklerinizde oturan aktif kiracilar.</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              void loadTenants();
            }} tintColor={theme.colors.primary} />}
          >
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Kiraci rehberi</Text>
              <Text style={styles.heroTitle}>{tenantCount} aktif eslesme</Text>
              <Text style={styles.heroSubtitle}>Telefon, e-posta ve bagli mulk bilgisini tek listede gorun.</Text>
            </View>

            {rows.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="people-outline" size={40} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>Aktif kiraci bulunamadi</Text>
                <Text style={styles.emptySubtitle}>Kiraci atanmis mulkler burada listelenecek.</Text>
              </View>
            ) : (
              rows.map((item) => (
                <TouchableOpacity
                  key={`${item.property_id}-${item.tenant?.id}`}
                  style={styles.card}
                  activeOpacity={0.86}
                  onPress={() => router.push(`/landlord/property-detail?id=${item.property_id}` as any)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.tenant?.full_name || '?').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.name}>{item.tenant?.full_name || 'Kiraci'}</Text>
                    <Text style={styles.meta}>{item.tenant?.email || 'E-posta yok'}</Text>
                    <Text style={styles.meta}>{item.tenant?.phone || 'Telefon yok'}</Text>
                    <Text style={styles.propertyLabel}>{item.property_label}</Text>
                    <Text style={styles.contractText}>
                      Sozlesme: {formatDate(item.contract_start)} - {formatDate(item.contract_end)}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </AnimatedScreen>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingBottom: 12,
    },
    headerBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary },
    headerSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
    scrollContent: { paddingHorizontal: 18, paddingBottom: 120, gap: 14 },
    heroCard: {
      borderRadius: 24,
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.md,
    },
    heroEyebrow: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    heroTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 8 },
    heroSubtitle: { fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary, marginTop: 6 },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 22,
      paddingVertical: 34,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
    emptySubtitle: { fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary, textAlign: 'center' },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
    name: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
    meta: { fontSize: 12, color: theme.colors.textMuted },
    propertyLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 },
    contractText: { fontSize: 11, color: theme.colors.textMuted },
  })
);
