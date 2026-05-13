import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createThemedStyles, useAppTheme } from '../theme';
import { supabase } from '../../services/supabase';
import { useUserData } from '../../hooks/useUserData';
import AnimatedHeaderScrollView from '../../components/Shared/AnimatedHeaderScrollView';
import { AreaChart, DonutChart } from '../../components/Shared/ReportCharts';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('tr-TR', { month: 'short' });
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const s = useCardStyles();
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)}>
      <View style={s.card}>{children}</View>
    </Animated.View>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  const theme = useAppTheme();
  const s = useCardStyles();
  return (
    <View style={s.secHeader}>
      <View style={s.secIconBg}>
        <MaterialIcons name={icon as any} size={18} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.secTitle}>{title}</Text>
        {subtitle ? <Text style={s.secSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const s = useCardStyles();
  const theme = useAppTheme();
  return (
    <View style={s.chip}>
      <Text style={[s.chipValue, color ? { color } : null]}>{value}</Text>
      <Text style={s.chipLabel}>{label}</Text>
    </View>
  );
}

function LoadingBox() {
  const theme = useAppTheme();
  return (
    <View style={{ paddingVertical: 28, alignItems: 'center' }}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={{ paddingVertical: 20, alignItems: 'center', gap: 8 }}>
      <MaterialIcons name="error-outline" size={24} color={theme.colors.error} />
      <Text style={{ fontSize: 13, color: theme.colors.error, textAlign: 'center' }}>{message}</Text>
      <TouchableOpacity onPress={onRetry}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>Tekrar dene</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── types ────────────────────────────────────────────────────────────────────

type Property = { id: string; status: string | null; tenant_id: string | null; address: string | null };
type Receipt = { id: string; amount: number | null; status: string | null; created_at: string | null; property_id: string | null };
type Maintenance = { id: string; status: string | null; created_at: string | null; property_id: string | null; title: string | null; priority: string | null };
type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

// ─── screen ───────────────────────────────────────────────────────────────────

export default function LandlordReportsScreen() {
  const theme = useAppTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { userData } = useUserData();

  const [props, setProps] = useState<FetchState<Property[]>>({ data: null, loading: true, error: null });
  const [receipts, setReceipts] = useState<FetchState<Receipt[]>>({ data: null, loading: true, error: null });
  const [maint, setMaint] = useState<FetchState<Maintenance[]>>({ data: null, loading: true, error: null });

  const loadProperties = useCallback(async () => {
    if (!userData?.id) return;
    setProps({ data: null, loading: true, error: null });
    const { data, error } = await supabase
      .from('properties')
      .select('id, status, tenant_id, address')
      .eq('landlord_id', userData.id);
    if (error) {
      setProps({ data: null, loading: false, error: error.message });
    } else {
      setProps({ data: (data as Property[]) || [], loading: false, error: null });
    }
  }, [userData?.id]);

  const loadReceipts = useCallback(async (propIds: string[]) => {
    if (!propIds.length) { setReceipts({ data: [], loading: false, error: null }); return; }
    setReceipts({ data: null, loading: true, error: null });
    const { data, error } = await supabase
      .from('receipts')
      .select('id, amount, status, created_at, property_id')
      .in('property_id', propIds);
    if (error) {
      setReceipts({ data: null, loading: false, error: error.message });
    } else {
      setReceipts({ data: (data as Receipt[]) || [], loading: false, error: null });
    }
  }, []);

  const loadMaintenance = useCallback(async (propIds: string[]) => {
    if (!propIds.length) { setMaint({ data: [], loading: false, error: null }); return; }
    setMaint({ data: null, loading: true, error: null });
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('id, status, created_at, property_id, title, priority')
      .in('property_id', propIds);
    if (error) {
      setMaint({ data: null, loading: false, error: error.message });
    } else {
      setMaint({ data: (data as Maintenance[]) || [], loading: false, error: null });
    }
  }, []);

  useEffect(() => { void loadProperties(); }, [loadProperties]);

  useEffect(() => {
    if (props.data !== null) {
      const ids = props.data.map((p) => p.id);
      void loadReceipts(ids);
      void loadMaintenance(ids);
    }
  }, [props.data, loadReceipts, loadMaintenance]);

  // ─── derived ─────────────────────────────────────────────────────────────────

  const allProps = props.data || [];
  const occupied = allProps.filter((p) => p.tenant_id);
  const vacant = allProps.filter((p) => !p.tenant_id);
  const occupancyPct = allProps.length ? Math.round((occupied.length / allProps.length) * 100) : 0;

  const allReceipts = receipts.data || [];
  const approved = allReceipts.filter((r) => r.status === 'approved');
  const pending = allReceipts.filter((r) => r.status === 'pending');
  const rejected = allReceipts.filter((r) => r.status === 'rejected');

  const approvedTotal = approved.reduce((s, r) => s + (r.amount || 0), 0);
  const pendingTotal = pending.reduce((s, r) => s + (r.amount || 0), 0);

  // Income last 6 months
  const incomeData = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const total = approved
        .filter((r) => {
          if (!r.created_at) return false;
          const rd = new Date(r.created_at);
          return rd.getFullYear() === y && rd.getMonth() === m;
        })
        .reduce((s, r) => s + (r.amount || 0), 0);
      return { label: monthLabel(d), value: total };
    });
  }, [approved]);

  const thisMonthIncome = incomeData[incomeData.length - 1]?.value || 0;

  // Maintenance
  const allMaint = maint.data || [];
  const openMaint = allMaint.filter((m) => m.status === 'open' || m.status === 'pending');
  const closedMaint = allMaint.filter((m) => m.status === 'completed' || m.status === 'closed');
  const criticalMaint = allMaint.filter((m) => m.priority === 'critical' || m.priority === 'high');

  const recentOpen = [...openMaint]
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 3);

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <AnimatedHeaderScrollView
      headerContent={
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Raporlar & Analizler</Text>
          <View style={{ width: 40 }} />
        </View>
      }
      scrollContentStyle={s.scroll}
    >
      {/* ─── 1. Kira Geliri ─── */}
      <SectionCard delay={0}>
        <SectionHeader icon="account-balance" title="Kira Geliri" subtitle="Son 6 ay onaylanan ödemeler" />
        {receipts.loading ? (
          <LoadingBox />
        ) : receipts.error ? (
          <ErrorBox message={receipts.error} onRetry={() => loadReceipts(allProps.map((p) => p.id))} />
        ) : (
          <View style={{ gap: 8 }}>
            <View style={{ gap: 2 }}>
              <Text style={s.bigNum}>{fmtCurrency(thisMonthIncome)}</Text>
              <Text style={s.bigNumSub}>Bu ay tahsilat</Text>
            </View>
            <AreaChart data={incomeData} color={theme.colors.primary} gradientId="landlordIncome" height={110} />
          </View>
        )}
      </SectionCard>

      {/* ─── 2. Dekont Durumu ─── */}
      <SectionCard delay={50}>
        <SectionHeader icon="receipt-long" title="Dekont Durumu" subtitle="Tüm zamanlar" />
        {receipts.loading ? (
          <LoadingBox />
        ) : receipts.error ? (
          <ErrorBox message={receipts.error} onRetry={() => loadReceipts(allProps.map((p) => p.id))} />
        ) : (
          <View>
            <View style={s.row}>
              <View style={[s.statusChip, { backgroundColor: theme.colors.successLight }]}>
                <Text style={[s.statusNum, { color: theme.colors.success }]}>{approved.length}</Text>
                <Text style={[s.statusLbl, { color: theme.colors.successText }]}>{fmtCurrency(approvedTotal)}</Text>
                <Text style={[s.statusTag, { color: theme.colors.successText }]}>Onaylı</Text>
              </View>
              <View style={[s.statusChip, { backgroundColor: theme.colors.warningLight }]}>
                <Text style={[s.statusNum, { color: theme.colors.warning }]}>{pending.length}</Text>
                <Text style={[s.statusLbl, { color: theme.colors.warningText }]}>{fmtCurrency(pendingTotal)}</Text>
                <Text style={[s.statusTag, { color: theme.colors.warningText }]}>Bekleyen</Text>
              </View>
              <View style={[s.statusChip, { backgroundColor: theme.colors.errorLight }]}>
                <Text style={[s.statusNum, { color: theme.colors.error }]}>{rejected.length}</Text>
                <Text style={[s.statusLbl, { color: theme.colors.errorText }]}>—</Text>
                <Text style={[s.statusTag, { color: theme.colors.errorText }]}>Reddedilen</Text>
              </View>
            </View>
          </View>
        )}
      </SectionCard>

      {/* ─── 3. Mülk Doluluk ─── */}
      <SectionCard delay={100}>
        <SectionHeader icon="home-work" title="Mülk Doluluk" subtitle={`${allProps.length} mülk`} />
        {props.loading ? (
          <LoadingBox />
        ) : props.error ? (
          <ErrorBox message={props.error} onRetry={loadProperties} />
        ) : (
          <View style={{ gap: 10 }}>
            <View style={s.row}>
              <DonutChart
                segments={[
                  { value: occupied.length || 0.01, color: theme.colors.primary },
                  { value: vacant.length || (occupied.length ? 0 : 0.01), color: theme.colors.surface2 },
                ]}
                size={100}
                strokeWidth={16}
                centerLabel={`${occupancyPct}%`}
              />
              <View style={s.chipCol}>
                <StatChip label="Toplam" value={allProps.length} />
                <StatChip label="Dolu" value={occupied.length} color={theme.colors.primary} />
                <StatChip label="Boş" value={vacant.length} color={theme.colors.textMuted} />
              </View>
            </View>
            {/* Progress bar */}
            <View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${occupancyPct}%` as any, backgroundColor: theme.colors.primary }]} />
              </View>
              <Text style={s.progressLabel}>Doluluk oranı %{occupancyPct}</Text>
            </View>
          </View>
        )}
      </SectionCard>

      {/* ─── 4. Bakım Özeti ─── */}
      <SectionCard delay={150}>
        <SectionHeader icon="build" title="Bakım Özeti" subtitle={`${allMaint.length} toplam talep`} />
        {maint.loading ? (
          <LoadingBox />
        ) : maint.error ? (
          <ErrorBox message={maint.error} onRetry={() => loadMaintenance(allProps.map((p) => p.id))} />
        ) : (
          <View style={{ gap: 10 }}>
            <View style={s.row}>
              <View style={[s.maintChip, { backgroundColor: theme.colors.warningLight }]}>
                <Text style={[s.maintNum, { color: theme.colors.warning }]}>{openMaint.length}</Text>
                <Text style={[s.maintLbl, { color: theme.colors.warningText }]}>Açık</Text>
              </View>
              <View style={[s.maintChip, { backgroundColor: theme.colors.errorLight }]}>
                <Text style={[s.maintNum, { color: theme.colors.error }]}>{criticalMaint.length}</Text>
                <Text style={[s.maintLbl, { color: theme.colors.errorText }]}>Kritik</Text>
              </View>
              <View style={[s.maintChip, { backgroundColor: theme.colors.successLight }]}>
                <Text style={[s.maintNum, { color: theme.colors.success }]}>{closedMaint.length}</Text>
                <Text style={[s.maintLbl, { color: theme.colors.successText }]}>Kapalı</Text>
              </View>
            </View>
            {recentOpen.length > 0 && (
              <View style={{ gap: 4 }}>
                <Text style={s.listHeader}>Son açık talepler</Text>
                {recentOpen.map((m) => (
                  <View key={m.id} style={s.listRow}>
                    <MaterialIcons
                      name="build-circle"
                      size={16}
                      color={m.priority === 'critical' ? theme.colors.error : theme.colors.warning}
                    />
                    <Text style={[s.listRowText, { flex: 1 }]} numberOfLines={1}>
                      {m.title || 'Bakım talebi'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </SectionCard>

      <View style={{ height: 40 + insets.bottom }} />
    </AnimatedHeaderScrollView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const useCardStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      padding: 16,
      gap: 12,
      ...theme.shadows.sm,
    },
    secHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    secIconBg: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    secTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
    secSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
    chip: {
      flex: 1, alignItems: 'center', backgroundColor: theme.colors.surface2,
      borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4, gap: 2,
    },
    chipValue: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
    chipLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
  }),
);

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
    bigNum: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
    bigNumSub: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '500' },
    row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    chipCol: { flex: 1, gap: 6 },
    statusChip: { flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 10, gap: 2 },
    statusNum: { fontSize: 22, fontWeight: '800' },
    statusLbl: { fontSize: 11, fontWeight: '600' },
    statusTag: { fontSize: 10, fontWeight: '500' },
    progressTrack: { height: 8, backgroundColor: theme.colors.surface2, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4 },
    progressLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, fontWeight: '500' },
    maintChip: { flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 10, gap: 2 },
    maintNum: { fontSize: 22, fontWeight: '800' },
    maintLbl: { fontSize: 11, fontWeight: '600' },
    listHeader: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginTop: 2 },
    listRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
    },
    listRowText: { fontSize: 13, color: theme.colors.textSecondary },
  }),
);
