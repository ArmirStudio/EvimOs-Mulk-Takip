import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
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
import AgentReportsPanel from '../../components/Shared/AgentReportsPanel';
import { AreaChart, ArcScore, DonutChart } from '../../components/Shared/ReportCharts';

const SCREEN_W = Dimensions.get('window').width;
const CARD_SNAP_W = SCREEN_W - 32 - 16; // padding 16 each side, gap 8 between

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('tr-TR', { month: 'short' });
}

function daysBetween(a: Date, b: Date) {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000);
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

function SectionHeader({
  icon,
  title,
  subtitle,
  iconBg,
  accentColor,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  iconBg?: string;
  accentColor?: string;
}) {
  const theme = useAppTheme();
  const s = useCardStyles();
  return (
    <View style={s.secHeader}>
      <View style={[s.secIconBg, iconBg ? { backgroundColor: iconBg } : null]}>
        <MaterialIcons name={icon as any} size={18} color={accentColor || theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.secTitle}>{title}</Text>
        {subtitle ? <Text style={s.secSubtitle}>{subtitle}</Text> : null}
      </View>
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

// Yatay kaydırmalı özet kartı
function HorizontalSnapCards({ items }: { items: { label: string; value: string | number; color?: string; icon: string; bg: string }[] }) {
  const theme = useAppTheme();
  const flatRef = useRef<FlatList>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <View>
      <FlatList
        ref={flatRef}
        data={items}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_SNAP_W / 2 + 8}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 8 }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_SNAP_W / 2 + 8));
          setActiveIdx(Math.min(idx, items.length - 1));
        }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View
            style={{
              width: CARD_SNAP_W / 2,
              borderRadius: 16,
              backgroundColor: item.bg,
              padding: 14,
              gap: 6,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.25)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <MaterialIcons name={item.icon as any} size={18} color={item.color || theme.colors.textPrimary} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: item.color || theme.colors.textPrimary }}>
              {item.value}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: item.color || theme.colors.textSecondary, opacity: 0.85 }}>
              {item.label}
            </Text>
          </View>
        )}
      />
      {/* Dot indicators */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 }}>
        {items.map((_, i) => (
          <View
            key={i}
            style={{
              width: activeIdx === i ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: activeIdx === i ? theme.colors.primary : theme.colors.surface2,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ─── types ────────────────────────────────────────────────────────────────────

type Property = {
  id: string;
  status: string | null;
  tenant_id: string | null;
  address: string | null;
  contract_end: string | null;
  updated_at: string | null;
  rent_day: number | null;
};

type Receipt = {
  id: string;
  amount: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  property_id: string | null;
};

type Maintenance = {
  id: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  property_id: string | null;
  title: string | null;
  priority: string | null;
};

type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

// ─── screen ───────────────────────────────────────────────────────────────────

export default function AgentReportsScreen() {
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
      .select('id, status, tenant_id, address, contract_end, updated_at, rent_day')
      .eq('agent_id', userData.id);
    if (error) {
      setProps({ data: null, loading: false, error: error.message });
    } else {
      setProps({ data: (data as Property[]) || [], loading: false, error: null });
    }
  }, [userData?.id]);

  const loadReceipts = useCallback(async (propIds: string[]) => {
    if (!propIds.length) {
      setReceipts({ data: [], loading: false, error: null });
      return;
    }
    setReceipts({ data: null, loading: true, error: null });
    const { data, error } = await supabase
      .from('receipts')
      .select('id, amount, status, created_at, updated_at, property_id')
      .in('property_id', propIds);
    if (error) {
      setReceipts({ data: null, loading: false, error: error.message });
    } else {
      setReceipts({ data: (data as Receipt[]) || [], loading: false, error: null });
    }
  }, []);

  const loadMaintenance = useCallback(async (propIds: string[]) => {
    if (!propIds.length) {
      setMaint({ data: [], loading: false, error: null });
      return;
    }
    setMaint({ data: null, loading: true, error: null });
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('id, status, created_at, updated_at, property_id, title, priority')
      .in('property_id', propIds);
    if (error) {
      setMaint({ data: null, loading: false, error: error.message });
    } else {
      setMaint({ data: (data as Maintenance[]) || [], loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    if (props.data !== null) {
      const ids = props.data.map((p) => p.id);
      void loadReceipts(ids);
      void loadMaintenance(ids);
    }
  }, [props.data, loadReceipts, loadMaintenance]);

  // ─── derived data ───────────────────────────────────────────────────────────

  const allProps = props.data || [];
  const occupied = allProps.filter((p) => p.tenant_id);
  const vacant = allProps.filter((p) => !p.tenant_id);
  const occupancyPct = allProps.length ? Math.round((occupied.length / allProps.length) * 100) : 0;

  const allReceipts = receipts.data || [];
  const approvedReceipts = allReceipts.filter((r) => r.status === 'approved');

  const incomeData = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const total = approvedReceipts
        .filter((r) => {
          if (!r.created_at) return false;
          const rd = new Date(r.created_at);
          return rd.getFullYear() === y && rd.getMonth() === m;
        })
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      return { label: monthLabel(d), value: total };
    });
  }, [approvedReceipts]);

  const thisMonthIncome = incomeData[incomeData.length - 1]?.value || 0;

  const lateScore = React.useMemo(() => {
    if (!occupied.length) return 100;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const onTime = occupied.filter((p) =>
      approvedReceipts.some((r) => {
        if (r.property_id !== p.id || !r.created_at) return false;
        const rd = new Date(r.created_at);
        return rd.getFullYear() === y && rd.getMonth() === m;
      }),
    );
    return Math.round((onTime.length / occupied.length) * 100);
  }, [occupied, approvedReceipts]);

  const onTimeCount = React.useMemo(() => {
    if (!occupied.length) return { on: 0, total: 0 };
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const on = occupied.filter((p) =>
      approvedReceipts.some((r) => {
        if (r.property_id !== p.id || !r.created_at) return false;
        const rd = new Date(r.created_at);
        return rd.getFullYear() === y && rd.getMonth() === m;
      }),
    ).length;
    return { on, total: occupied.length };
  }, [occupied, approvedReceipts]);

  const contractBuckets = React.useMemo(() => {
    const now = new Date();
    const d30 = new Date(now.getTime() + 30 * 86400000);
    const d60 = new Date(now.getTime() + 60 * 86400000);
    const d90 = new Date(now.getTime() + 90 * 86400000);
    const within30: Property[] = [];
    const within60: Property[] = [];
    const within90: Property[] = [];
    allProps.forEach((p) => {
      if (!p.contract_end) return;
      const end = new Date(p.contract_end);
      if (end <= d30) within30.push(p);
      else if (end <= d60) within60.push(p);
      else if (end <= d90) within90.push(p);
    });
    return { within30, within60, within90 };
  }, [allProps]);

  const upcomingContracts = React.useMemo(() => {
    const now = new Date();
    const d90 = new Date(now.getTime() + 90 * 86400000);
    return allProps
      .filter((p) => p.contract_end && new Date(p.contract_end) <= d90 && new Date(p.contract_end) >= now)
      .sort((a, b) => new Date(a.contract_end!).getTime() - new Date(b.contract_end!).getTime())
      .slice(0, 5);
  }, [allProps]);

  const vacantWithAge = React.useMemo(() => {
    const now = new Date();
    return vacant
      .map((p) => ({
        ...p,
        days: p.updated_at ? daysBetween(new Date(p.updated_at), now) : 0,
      }))
      .sort((a, b) => b.days - a.days);
  }, [vacant]);

  const responseSpeed = React.useMemo(() => {
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const recent = approvedReceipts.filter((r) => r.created_at && new Date(r.created_at) >= cutoff);
    if (!recent.length) return null;
    const avgMs =
      recent.reduce((sum, r) => {
        const a = r.created_at ? new Date(r.created_at).getTime() : 0;
        const b = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        return sum + Math.max(0, b - a);
      }, 0) / recent.length;
    return +(avgMs / 86400000).toFixed(1);
  }, [approvedReceipts]);

  const maintStats = React.useMemo(() => {
    const allM = maint.data || [];
    const now = new Date();
    const cutoff30 = new Date(now.getTime() - 30 * 86400000);
    const cutoff60 = new Date(now.getTime() - 60 * 86400000);
    const closed = allM.filter((m) => m.status === 'completed' || m.status === 'closed');
    const closedThis = closed.filter((m) => m.updated_at && new Date(m.updated_at) >= cutoff30);
    const closedLast = closed.filter(
      (m) => m.updated_at && new Date(m.updated_at) < cutoff30 && new Date(m.updated_at) >= cutoff60,
    );
    const avgDays = (arr: Maintenance[]) => {
      if (!arr.length) return null;
      const total = arr.reduce((sum, m) => {
        const a = m.created_at ? new Date(m.created_at).getTime() : 0;
        const b = m.updated_at ? new Date(m.updated_at).getTime() : 0;
        return sum + Math.max(0, b - a);
      }, 0);
      return +(total / arr.length / 86400000).toFixed(1);
    };
    const open = allM.filter((m) => m.status === 'open' || m.status === 'pending');
    return { avgThis: avgDays(closedThis), avgLast: avgDays(closedLast), openCount: open.length };
  }, [maint.data]);

  // Yatay kayan stat kartları için veri
  const occupancyCards = React.useMemo(() => [
    { label: 'Toplam Mülk', value: allProps.length, icon: 'home-work', bg: theme.colors.primaryLight, color: theme.colors.primary },
    { label: 'Kirada', value: occupied.length, icon: 'people', bg: theme.colors.successLight, color: theme.colors.success },
    { label: 'Boş', value: vacant.length, icon: 'home', bg: theme.colors.warningLight, color: theme.colors.warning },
    { label: 'Doluluk', value: `${occupancyPct}%`, icon: 'pie-chart', bg: occupancyPct >= 80 ? theme.colors.successLight : theme.colors.primaryLight, color: occupancyPct >= 80 ? theme.colors.success : theme.colors.primary },
  ], [allProps.length, occupied.length, vacant.length, occupancyPct, theme]);

  // Hızlı performans kartları (yana kayan)
  const performanceCards = React.useMemo(() => [
    {
      label: 'Kira Gecikme Skoru',
      value: `%${lateScore}`,
      icon: 'timer',
      bg: lateScore >= 80 ? theme.colors.successLight : theme.colors.warningLight,
      color: lateScore >= 80 ? theme.colors.success : theme.colors.warning,
    },
    {
      label: 'Tepki Hızı (gün)',
      value: responseSpeed !== null ? `${responseSpeed}` : '—',
      icon: 'speed',
      bg: theme.colors.primaryLight,
      color: theme.colors.primary,
    },
    {
      label: 'Açık Bakım',
      value: maintStats.openCount,
      icon: 'build',
      bg: maintStats.openCount > 0 ? theme.colors.errorLight : theme.colors.successLight,
      color: maintStats.openCount > 0 ? theme.colors.error : theme.colors.success,
    },
    {
      label: 'Çözüm Süresi',
      value: maintStats.avgThis !== null ? `${maintStats.avgThis}g` : '—',
      icon: 'check-circle-outline',
      bg: theme.colors.surface2,
      color: theme.colors.textSecondary,
    },
  ], [lateScore, responseSpeed, maintStats, theme]);

  // ─── render ─────────────────────────────────────────────────────────────────

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
      {/* ─── 1. Mülk & Doluluk — Yatay Kaydırmalı ─── */}
      <SectionCard delay={0}>
        <SectionHeader
          icon="home-work"
          title="Mülk & Doluluk"
          subtitle={`${allProps.length} mülk yönetiliyor`}
        />
        {props.loading ? (
          <LoadingBox />
        ) : props.error ? (
          <ErrorBox message={props.error} onRetry={loadProperties} />
        ) : (
          <View style={{ gap: 14 }}>
            <View style={s.donutRow}>
              <DonutChart
                segments={[
                  { value: occupied.length || 0.01, color: theme.colors.primary },
                  { value: vacant.length || (occupied.length ? 0 : 0.01), color: theme.colors.surface2 },
                ]}
                size={100}
                strokeWidth={16}
                centerLabel={`${occupancyPct}%`}
                centerSublabel="Dolu"
              />
              <View style={{ flex: 1 }}>
                <Text style={s.bigOccupancy}>{occupancyPct}%</Text>
                <Text style={s.bigOccupancySub}>doluluk oranı</Text>
                <Text style={[s.bigOccupancySub, { marginTop: 4 }]}>
                  {occupied.length}/{allProps.length} mülk kirada
                </Text>
              </View>
            </View>
            <HorizontalSnapCards items={occupancyCards} />
          </View>
        )}
      </SectionCard>

      {/* ─── 2. Gelir Raporu ─── */}
      <SectionCard delay={50}>
        <SectionHeader
          icon="account-balance"
          title="Gelir Raporu"
          subtitle="Son 6 ay onaylanan kira"
          iconBg={theme.colors.successLight}
          accentColor={theme.colors.success}
        />
        {receipts.loading ? (
          <LoadingBox />
        ) : receipts.error ? (
          <ErrorBox message={receipts.error} onRetry={() => loadReceipts(allProps.map((p) => p.id))} />
        ) : (
          <View style={{ gap: 8 }}>
            <View style={s.bigNumRow}>
              <Text style={[s.bigNum, { color: theme.colors.success }]}>{fmtCurrency(thisMonthIncome)}</Text>
              <Text style={s.bigNumSub}>Bu ay tahsilat</Text>
            </View>
            <AreaChart data={incomeData} color={theme.colors.success} gradientId="agentIncome" height={110} />
          </View>
        )}
      </SectionCard>

      {/* ─── 3. Performans Özeti — Yatay Kaydırmalı Kartlar ─── */}
      <SectionCard delay={100}>
        <SectionHeader icon="insights" title="Performans Özeti" subtitle="Kira, tepki ve bakım metrikleri" />
        {receipts.loading || maint.loading ? (
          <LoadingBox />
        ) : (
          <HorizontalSnapCards items={performanceCards} />
        )}
      </SectionCard>

      {/* ─── 4. Kira Gecikme Skoru ─── */}
      <SectionCard delay={130}>
        <SectionHeader icon="timer" title="Kira Gecikme Skoru" subtitle="Bu ay zamanında ödeme oranı" />
        {receipts.loading ? (
          <LoadingBox />
        ) : (
          <View style={s.arcRow}>
            <ArcScore score={lateScore} size={150} />
            <Text style={s.arcSub}>
              {onTimeCount.on}/{onTimeCount.total} kiracı bu ay zamanında ödedi
            </Text>
          </View>
        )}
      </SectionCard>

      {/* ─── 5. Sözleşme Bitiş Takvimi ─── */}
      <SectionCard delay={160}>
        <SectionHeader
          icon="event"
          title="Sözleşme Bitiş Takvimi"
          subtitle="Önümüzdeki 90 gün"
          iconBg={theme.colors.warningLight}
          accentColor={theme.colors.warning}
        />
        {props.loading ? (
          <LoadingBox />
        ) : (
          <View style={{ gap: 10 }}>
            <View style={s.row}>
              <View style={[s.contractChip, { backgroundColor: theme.colors.errorLight }]}>
                <Text style={[s.contractChipNum, { color: theme.colors.error }]}>{contractBuckets.within30.length}</Text>
                <Text style={[s.contractChipLbl, { color: theme.colors.errorText }]}>30 gün</Text>
              </View>
              <View style={[s.contractChip, { backgroundColor: theme.colors.warningLight }]}>
                <Text style={[s.contractChipNum, { color: theme.colors.warning }]}>{contractBuckets.within60.length}</Text>
                <Text style={[s.contractChipLbl, { color: theme.colors.warningText }]}>60 gün</Text>
              </View>
              <View style={[s.contractChip, { backgroundColor: theme.colors.successLight }]}>
                <Text style={[s.contractChipNum, { color: theme.colors.success }]}>{contractBuckets.within90.length}</Text>
                <Text style={[s.contractChipLbl, { color: theme.colors.successText }]}>90 gün</Text>
              </View>
            </View>
            {upcomingContracts.length === 0 ? (
              <View style={s.successRow}>
                <MaterialIcons name="check-circle" size={18} color={theme.colors.success} />
                <Text style={[s.emptyNote, { color: theme.colors.successText }]}>90 gün içinde biten sözleşme yok</Text>
              </View>
            ) : (
              upcomingContracts.map((p) => {
                const daysLeft = p.contract_end ? daysBetween(new Date(), new Date(p.contract_end)) : 0;
                const color =
                  daysLeft <= 30 ? theme.colors.error : daysLeft <= 60 ? theme.colors.warning : theme.colors.success;
                return (
                  <View key={p.id} style={s.listRow}>
                    <Text style={s.listRowText} numberOfLines={1}>{p.address || 'Bilinmeyen adres'}</Text>
                    <Text style={[s.listRowBadge, { color }]}>{daysLeft} gün</Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </SectionCard>

      {/* ─── 6. Boş Mülk Alarmı ─── */}
      <SectionCard delay={190}>
        <SectionHeader
          icon="warning"
          title="Boş Mülk Alarmı"
          subtitle={`${vacant.length} boş mülk`}
          iconBg={vacant.length > 0 ? theme.colors.errorLight : theme.colors.successLight}
          accentColor={vacant.length > 0 ? theme.colors.error : theme.colors.success}
        />
        {props.loading ? (
          <LoadingBox />
        ) : vacant.length === 0 ? (
          <View style={s.successRow}>
            <MaterialIcons name="check-circle" size={20} color={theme.colors.success} />
            <Text style={[s.emptyNote, { color: theme.colors.successText }]}>Tüm mülkler dolu!</Text>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {vacantWithAge.slice(0, 6).map((p) => {
              const color = p.days >= 30 ? theme.colors.error : theme.colors.warning;
              return (
                <View key={p.id} style={s.listRow}>
                  <MaterialIcons name="home" size={14} color={color} />
                  <Text style={s.listRowText} numberOfLines={1}>{p.address || 'Bilinmeyen adres'}</Text>
                  <Text style={[s.listRowBadge, { color }]}>{p.days} gün boş</Text>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>

      {/* ─── 7. Bakım Çözüm Hızı ─── */}
      <SectionCard delay={220}>
        <SectionHeader icon="build" title="Bakım Çözüm Hızı" subtitle="Bu ay kapatılan talepler" />
        {maint.loading ? (
          <LoadingBox />
        ) : (
          <View style={{ gap: 8 }}>
            <View style={s.bigNumRow}>
              <Text style={s.bigNum}>
                {maintStats.avgThis !== null ? `${maintStats.avgThis} gün` : '—'}
              </Text>
              <Text style={s.bigNumSub}>
                {maintStats.avgLast !== null ? `Geçen ay: ${maintStats.avgLast} gün` : 'Ortalama çözüm süresi'}
              </Text>
            </View>
            <View style={s.listRow}>
              <MaterialIcons name="pending-actions" size={16} color={theme.colors.warning} />
              <Text style={[s.listRowText, { flex: 1 }]}>Açık talep</Text>
              <Text style={[s.listRowBadge, { color: theme.colors.warning }]}>{maintStats.openCount}</Text>
            </View>
          </View>
        )}
      </SectionCard>

      {/* ─── 8 & 9. Harcama + Ekip (AgentReportsPanel) ─── */}
      <Animated.View entering={FadeInDown.delay(260).duration(380)}>
        <View style={s.panelWrap}>
          <AgentReportsPanel />
        </View>
      </Animated.View>

      <View style={{ height: 40 + insets.bottom }} />
    </AnimatedHeaderScrollView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const useCardStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      gap: 12,
      ...theme.shadows.sm,
    },
    secHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    secIconBg: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
    secSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  }),
);

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: 16, gap: 14 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
    row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    bigOccupancy: { fontSize: 32, fontWeight: '900', color: theme.colors.textPrimary },
    bigOccupancySub: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' },
    bigNumRow: { gap: 2 },
    bigNum: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
    bigNumSub: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '500' },
    arcRow: { alignItems: 'center', gap: 6 },
    arcSub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', fontWeight: '500' },
    contractChip: { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 12, gap: 2 },
    contractChipNum: { fontSize: 24, fontWeight: '900' },
    contractChipLbl: { fontSize: 11, fontWeight: '600' },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    listRowText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary },
    listRowBadge: { fontSize: 12, fontWeight: '700' },
    emptyNote: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 8 },
    successRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    panelWrap: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
  }),
);
