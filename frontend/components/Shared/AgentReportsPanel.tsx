import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { getExpenseSummary, getTeamReport } from '../../services/appApi';
import type {
  ExpenseMonthlySummary,
  TeamReportPayload,
  TeamReportRange,
} from '../../services/teamTypes';
import {
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_LABELS,
} from '../../services/teamTypes';
import { getReportBarTone } from '../../utils/teamPresentation';

type WeekRange = 'this_week' | 'last_week';

const WEEK_TOGGLES: { value: WeekRange; label: string }[] = [
  { value: 'this_week', label: 'Bu Hafta' },
  { value: 'last_week', label: 'Geçen Hafta' },
];

function formatCurrency(amount: number) {
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

function formatYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

function getRankEmoji(index: number) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `${index + 1}.`;
}

export default function AgentReportsPanel() {
  const theme = useAppTheme();
  const s = useStyles();

  const [activeWeek, setActiveWeek] = useState<WeekRange>('this_week');

  const [expenseSummary, setExpenseSummary] = useState<ExpenseMonthlySummary[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError] = useState<string | null>(null);

  const [report, setReport] = useState<TeamReportPayload | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    try {
      setExpensesLoading(true);
      setExpensesError(null);
      const res = await getExpenseSummary();
      setExpenseSummary(res.summary || []);
    } catch (e: any) {
      setExpensesError(e.message || 'Harcama özeti yüklenemedi.');
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (range: TeamReportRange) => {
    try {
      setReportLoading(true);
      setReportError(null);
      const res = await getTeamReport(range);
      setReport(res);
    } catch (e: any) {
      setReportError(e.message || 'Rapor yüklenemedi.');
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    void loadReport(activeWeek);
  }, [activeWeek, loadReport]);

  const currentMonth = expenseSummary[0];

  return (
    <View style={s.content}>
      {/* ── Harcama Özeti ── */}
      <View style={s.sectionHeaderRow}>
        <MaterialIcons name="account-balance-wallet" size={16} color={theme.colors.primary} />
        <Text style={s.sectionLabel}>HARCAMA ÖZETİ</Text>
      </View>

      {expensesLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : expensesError ? (
        <View style={s.errorBox}>
          <MaterialIcons name="error-outline" size={20} color={theme.colors.error} />
          <Text style={s.errorText}>{expensesError}</Text>
          <TouchableOpacity onPress={loadExpenses}>
            <Text style={s.retryText}>Tekrar dene</Text>
          </TouchableOpacity>
        </View>
      ) : expenseSummary.length === 0 ? (
        <View style={s.emptyBox}>
          <MaterialIcons name="receipt-long" size={36} color={theme.colors.textMuted} />
          <Text style={s.emptyText}>Henüz harcama kaydı yok</Text>
        </View>
      ) : (
        <>
          {currentMonth && (
            <Animated.View entering={FadeInDown.duration(320)} style={s.totalCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.totalLabel}>{formatYearMonth(currentMonth.year_month)}</Text>
                <Text style={s.totalAmount}>{formatCurrency(currentMonth.total)}</Text>
              </View>
              <View style={[s.totalIconBg, { backgroundColor: theme.colors.primaryLight }]}>
                <MaterialIcons name="account-balance-wallet" size={24} color={theme.colors.primary} />
              </View>
            </Animated.View>
          )}

          {currentMonth && currentMonth.by_category.length > 0 && (
            <Animated.View entering={FadeInDown.delay(50).duration(320)} style={s.card}>
              <Text style={s.cardTitle}>Kategoriye Göre</Text>
              {currentMonth.by_category
                .sort((a, b) => b.total - a.total)
                .map((item) => {
                  const pct = currentMonth.total > 0 ? item.total / currentMonth.total : 0;
                  const color = EXPENSE_CATEGORY_COLORS[item.category] || theme.colors.primary;
                  return (
                    <View key={item.category} style={s.catRow}>
                      <View style={[s.catDot, { backgroundColor: color }]} />
                      <Text style={s.catLabel}>{EXPENSE_CATEGORY_LABELS[item.category] || item.label}</Text>
                      <View style={s.catBarWrap}>
                        <View
                          style={[
                            s.catBar,
                            { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color },
                          ]}
                        />
                      </View>
                      <Text style={s.catAmount}>{formatCurrency(item.total)}</Text>
                    </View>
                  );
                })}
            </Animated.View>
          )}

          {expenseSummary.length > 1 && (
            <Animated.View entering={FadeInDown.delay(100).duration(320)} style={s.card}>
              <Text style={s.cardTitle}>Son Aylar</Text>
              {expenseSummary.slice(0, 6).map((month) => (
                <View key={month.year_month} style={s.monthRow}>
                  <Text style={s.monthLabel}>{formatYearMonth(month.year_month)}</Text>
                  <Text style={s.monthAmount}>{formatCurrency(month.total)}</Text>
                </View>
              ))}
            </Animated.View>
          )}
        </>
      )}

      {/* ── Ekip Performansı ── */}
      <View style={[s.sectionHeaderRow, { marginTop: 24 }]}>
        <MaterialIcons name="groups" size={16} color={theme.colors.primary} />
        <Text style={s.sectionLabel}>EKİP PERFORMANSI</Text>
      </View>

      {/* Haftalık Toggle */}
      <View style={s.weekToggle}>
        {WEEK_TOGGLES.map((item) => {
          const active = activeWeek === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[s.weekToggleBtn, active && s.weekToggleBtnActive]}
              onPress={() => setActiveWeek(item.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.weekToggleText, active && s.weekToggleTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {reportLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : reportError ? (
        <View style={s.errorBox}>
          <MaterialIcons name="error-outline" size={20} color={theme.colors.error} />
          <Text style={s.errorText}>{reportError}</Text>
          <TouchableOpacity onPress={() => loadReport(activeWeek)}>
            <Text style={s.retryText}>Tekrar dene</Text>
          </TouchableOpacity>
        </View>
      ) : report ? (
        Object.entries(report.sections).map(([key, section], idx) => {
          const isTeamPerformance = key === 'teamPerformance';
          return (
            <Animated.View
              key={section.title}
              entering={FadeInDown.delay(idx * 60).duration(320)}
              style={s.card}
            >
              <Text style={s.cardTitle}>{section.title}</Text>
              {section.subtitle ? <Text style={s.cardSubtitle}>{section.subtitle}</Text> : null}

              {/* Metrikler */}
              {section.metrics.length > 0 && (
                <View style={s.metricsRow}>
                  {section.metrics.map((metric) => (
                    <View key={metric.label} style={s.metricItem}>
                      <Text style={s.metricValue}>{metric.value}</Text>
                      <Text style={s.metricLabel}>{metric.label}</Text>
                      {metric.change ? (
                        <Text
                          style={[
                            s.metricChange,
                            metric.change.startsWith('+')
                              ? { color: theme.colors.success }
                              : { color: theme.colors.error },
                          ]}
                        >
                          {metric.change}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {/* Leaderboard (ekip performansı bölümünde) veya normal barlar */}
              {section.bars.length > 0 && (
                isTeamPerformance ? (
                  <View style={s.leaderboard}>
                    <Text style={s.leaderboardTitle}>Sıralama</Text>
                    {(() => {
                      const maxVal = Math.max(...section.bars.map((b) => b.value), 1);
                      return section.bars.map((bar, i) => (
                        <View key={bar.label} style={s.leaderboardRow}>
                          <Text style={[s.rankBadge, i < 3 && s.rankBadgeTop]}>
                            {getRankEmoji(i)}
                          </Text>
                          <View style={{ flex: 1, gap: 4 }}>
                            <View style={s.leaderRowTop}>
                              <Text style={s.leaderName} numberOfLines={1}>{bar.label}</Text>
                              <Text style={[s.leaderScore, { color: getReportBarTone(theme, bar.tone) }]}>
                                {bar.value}
                              </Text>
                            </View>
                            <View style={s.leaderBarTrack}>
                              <View
                                style={[
                                  s.leaderBarFill,
                                  {
                                    width: `${Math.round((bar.value / maxVal) * 100)}%` as any,
                                    backgroundColor: getReportBarTone(theme, bar.tone),
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                      ));
                    })()}
                  </View>
                ) : (
                  <View style={s.barsWrap}>
                    {(() => {
                      const maxVal = Math.max(...section.bars.map((b) => b.value), 1);
                      return section.bars.map((bar) => (
                        <View key={bar.label} style={s.barRow}>
                          <Text style={s.barLabel} numberOfLines={1}>{bar.label}</Text>
                          <View style={s.barTrack}>
                            <View
                              style={[
                                s.barFill,
                                {
                                  width: `${Math.round((bar.value / maxVal) * 100)}%` as any,
                                  backgroundColor: getReportBarTone(theme, bar.tone),
                                },
                              ]}
                            />
                          </View>
                          <Text style={s.barValue}>{bar.value}</Text>
                        </View>
                      ));
                    })()}
                  </View>
                )
              )}
            </Animated.View>
          );
        })
      ) : null}

      <View style={{ height: 80 }} />
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    content: { paddingTop: 8, paddingBottom: 40 },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      letterSpacing: 0.8,
    },
    loadingBox: { paddingVertical: 32, alignItems: 'center' },
    errorBox: { paddingVertical: 24, alignItems: 'center', gap: 8 },
    errorText: { fontSize: 13, color: theme.colors.error, textAlign: 'center' },
    retryText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
    emptyBox: {
      paddingVertical: 36,
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
    totalCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
      ...theme.shadows.sm,
    },
    totalLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 4 },
    totalAmount: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
    totalIconBg: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
      gap: 10,
    },
    cardTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
    cardSubtitle: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17, marginTop: -4 },
    catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    catLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, width: 70 },
    catBarWrap: { flex: 1, height: 6, backgroundColor: theme.colors.surface2, borderRadius: 3, overflow: 'hidden' },
    catBar: { height: 6, borderRadius: 3 },
    catAmount: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary, width: 80, textAlign: 'right' },
    monthRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    monthLabel: { fontSize: 14, color: theme.colors.textSecondary },
    monthAmount: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },

    // ── Haftalık Toggle ──
    weekToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface2,
      borderRadius: 14,
      padding: 4,
      marginBottom: 12,
    },
    weekToggleBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 11,
      alignItems: 'center',
    },
    weekToggleBtnActive: {
      backgroundColor: theme.colors.primary,
      ...theme.shadows.sm,
    },
    weekToggleText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    weekToggleTextActive: {
      color: theme.colors.textInverse,
    },

    // ── Metrikler ──
    metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metricItem: {
      flex: 1,
      minWidth: 80,
      backgroundColor: theme.colors.surface2,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      gap: 2,
    },
    metricValue: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
    metricLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, textAlign: 'center' },
    metricChange: { fontSize: 11, fontWeight: '700' },

    // ── Normal Barlar ──
    barsWrap: { gap: 8 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barLabel: { fontSize: 12, color: theme.colors.textSecondary, width: 100 },
    barTrack: { flex: 1, height: 8, backgroundColor: theme.colors.surface2, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4 },
    barValue: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary, width: 28, textAlign: 'right' },

    // ── Leaderboard ──
    leaderboard: { gap: 10, marginTop: 4 },
    leaderboardTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    leaderboardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 4,
    },
    rankBadge: {
      width: 28,
      fontSize: 16,
      textAlign: 'center',
      color: theme.colors.textMuted,
      fontWeight: '700',
    },
    rankBadgeTop: {
      fontSize: 18,
    },
    leaderRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leaderName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      flex: 1,
    },
    leaderScore: {
      fontSize: 13,
      fontWeight: '800',
      marginLeft: 8,
    },
    leaderBarTrack: {
      height: 5,
      backgroundColor: theme.colors.surface2,
      borderRadius: 3,
      overflow: 'hidden',
    },
    leaderBarFill: {
      height: 5,
      borderRadius: 3,
    },
  }),
);
