import React, { useEffect, useState } from 'react';
import { Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles } from '../theme';
import { tr } from '../translations';
import { getAdminDashboard } from '../../services/appApi';
import { resolveSupabaseStorageUrl } from '../../services/supabaseStorage';

interface DashboardStats {
  offices: number;
  companies: number;
  standaloneAgents: number;
  totalAgents: number;
  totalLandlords: number;
  totalTenants: number;
  totalProperties: number;
  occupiedProperties: number;
  avgRent: number;
  receiptsUploadedThisMonth: number;
  maintenanceCreatedThisMonth: number;
  recentRecords: {
    id: string;
    type: 'office' | 'company' | 'standalone';
    name: string;
    location: string;
    logo_url: string | null;
  }[];
}

const EMPTY_STATS: DashboardStats = {
  offices: 0,
  companies: 0,
  standaloneAgents: 0,
  totalAgents: 0,
  totalLandlords: 0,
  totalTenants: 0,
  totalProperties: 0,
  occupiedProperties: 0,
  avgRent: 0,
  receiptsUploadedThisMonth: 0,
  maintenanceCreatedThisMonth: 0,
  recentRecords: [],
};

function resolveAdminWebUrl() {
  return (process.env.EXPO_PUBLIC_ADMIN_WEB_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export default function AdminDashboardScreen() {
  const styles = useStyles();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getAdminDashboard();
      setStats({
        ...EMPTY_STATS,
        ...response,
        recentRecords: (response.recentRecords || []).map((record: any) => ({
          ...record,
          logo_url:
            record.type === 'standalone'
              ? resolveSupabaseStorageUrl('avatars', record.logo_url)
              : resolveSupabaseStorageUrl('agency-branding', record.logo_url),
        })),
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Admin Anasayfa</Text>
          <Text style={styles.subtitle}>
            Gerçek sayımlar ofis, şirket, bağımsız emlakçı ve operasyon verileriyle birlikte güncellendi.
          </Text>
        </View>

        <View style={styles.grid}>
          <MetricCard label="Ofis" value={stats.offices} />
          <MetricCard label="Şirket" value={stats.companies} />
          <MetricCard label="Bağımsız" value={stats.standaloneAgents} />
          <MetricCard label="Toplam Emlakçı" value={stats.totalAgents} />
        </View>

        <View style={styles.analyticsCard}>
          <Text style={styles.sectionTitle}>Kullanim Ozeti</Text>
          <View style={styles.analyticsRow}>
            <AnalyticsItem label="Ev Sahibi" value={stats.totalLandlords} />
            <AnalyticsItem label="Kiraci" value={stats.totalTenants} />
            <AnalyticsItem label="Mulk" value={stats.totalProperties} />
            <AnalyticsItem label="Dolu" value={stats.occupiedProperties} />
          </View>
        </View>

        <View style={styles.analyticsCard}>
          <Text style={styles.sectionTitle}>Aylik Hareket</Text>
          <View style={styles.analyticsRow}>
            <AnalyticsItem label="Makbuz" value={stats.receiptsUploadedThisMonth} />
            <AnalyticsItem label="Ariza" value={stats.maintenanceCreatedThisMonth} />
            <AnalyticsItem label="Ort. Kira" value={`₺${stats.avgRent.toLocaleString('tr-TR')}`} />
          </View>
        </View>

        {/* Reklam Yonetimi Linki */}
        <TouchableOpacity
          style={styles.adManagementCard}
          onPress={() => Linking.openURL(resolveAdminWebUrl())}
          activeOpacity={0.7}
        >
          <Ionicons name="megaphone-outline" size={28} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.adManagementTitle}>{tr.admin.adManagement}</Text>
            <Text style={styles.adManagementSub}>{tr.admin.adManagementSub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.analyticsCard}>
          <Text style={styles.sectionTitle}>Son Eklenen Kayıtlar</Text>
          {stats.recentRecords.length > 0 ? (
            stats.recentRecords.map((record) => (
              <View key={`${record.type}-${record.id}`} style={styles.recordRow}>
                {record.logo_url ? (
                  <Image source={{ uri: record.logo_url }} style={styles.recordLogo} />
                ) : (
                  <View style={styles.recordPlaceholder}>
                    <Text style={styles.recordPlaceholderText}>{record.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.recordInfo}>
                  <Text style={styles.recordName}>{record.name}</Text>
                  <Text style={styles.recordMeta}>
                    {record.type === 'company' ? 'Şirket' : record.type === 'office' ? 'Ofis' : 'Bağımsız Emlakçı'} • {record.location}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Henüz kayıt bulunmuyor.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  const styles = useStyles();
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function AnalyticsItem({ label, value }: { label: string; value: string | number }) {
  const styles = useStyles();
  return (
    <View style={styles.analyticsItem}>
      <Text style={styles.analyticsValue}>{value}</Text>
      <Text style={styles.analyticsLabel}>{label}</Text>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { padding: theme.spacing.lg, paddingBottom: 100, gap: theme.spacing.md },
    header: { gap: theme.spacing.xs },
    title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
    metricCard: { flex: 1, minWidth: '46%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
    metricValue: { fontSize: theme.fontSize.xxxl, fontWeight: theme.fontWeight.bold, color: theme.colors.primary },
    metricLabel: { marginTop: theme.spacing.xs, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
    analyticsCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
    sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
    analyticsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
    analyticsItem: { flex: 1, minWidth: '30%', alignItems: 'center' },
    analyticsValue: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.primary },
    analyticsLabel: { marginTop: 4, fontSize: theme.fontSize.xs, textAlign: 'center', color: theme.colors.textMuted },
    recordRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
    recordLogo: { width: 48, height: 48, borderRadius: 18 },
    recordPlaceholder: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
    recordPlaceholderText: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    recordInfo: { flex: 1 },
    recordName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
    recordMeta: { marginTop: 2, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
    emptyText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
    adManagementCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
    adManagementTitle: { fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.bold, color: '#fff' },
    adManagementSub: { fontSize: theme.fontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  })
);
