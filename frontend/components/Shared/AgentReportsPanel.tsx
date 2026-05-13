import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
import { TEAM_REPORT_RANGE_LABELS, getReportBarTone } from '../../utils/teamPresentation';

const RANGES: TeamReportRange[] = ['this_week', 'last_week', 'this_month', 'last_month'];

function formatCurrency(amount: number) {
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

function formatYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

export default function AgentReportsPanel() {
  const theme = useAppTheme();
  const s = useStyles();

  const [activeRange, setActiveRange] = useState<TeamReportRange>('this_month');

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
    void loadReport(activeRange);
  }, [activeRange, loadReport]);

  const currentMonth = expenseSummary[0];

  return (
    <View style={s.content}>
      {/* ── Harcama Özeti ── */}
      <Text style={s.sectionLabel}>HARCAMA ÖZETİ</Text>

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
          {/* Bu ay toplam */}
          {currentMonth && (
            <View style={s.totalCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.totalLabel}>{formatYearMonth(currentMonth.year_month)}</Text>
                <Text style={s.totalAmount}>{formatCurrency(currentMonth.total)}</Text>
              </View>
              <View style={[s.totalIconBg, { backgroundColor: theme.colors.primaryLight }]}>
                <MaterialIcons name="account-balance-wallet" size={24} color={theme.colors.primary} />
              </View>
            </View>
          )}

          {/* Kategori dağılımı - bu ay */}
          {currentMonth && currentMonth.by_category.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Kategoriye Göre</Text>
              {currentMonth.by_category
                .sort((a, b) => b.total - a.total)
                .map(item => {
                  const pct = currentMonth.total > 0 ? item.total / currentMonth.total : 0;
                  const color = EXPENSE_CATEGORY_COLORS[item.category] || theme.colors.primary;
                  return (
                    <View key={item.category} style={s.catRow}>
                      <View style={[s.catDot, { backgroundColor: color }]} />
                      <Text style={s.catLabel}>{EXPENSE_CATEGORY_LABELS[item.category] || item.label}</Text>
                      <View style={s.catBarWrap}>
                        <View style={[s.catBar, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
                      </View>
                      <Text style={s.catAmount}>{formatCurrency(item.total)}</Text>
                    </View>
                  );
                })}
            </View>
          )}

          {/* Son 12 ay özeti */}
          {expenseSummary.length > 1 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Son Aylar</Text>
              {expenseSummary.slice(0, 6).map(month => (
                <View key={month.year_month} style={s.monthRow}>
                  <Text style={s.monthLabel}>{formatYearMonth(month.year_month)}</Text>
                  <Text style={s.monthAmount}>{formatCurrency(month.total)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* ── Ekip Performansı ── */}
      <Text style={[s.sectionLabel, { marginTop: 24 }]}>EKİP PERFORMANSI</Text>

      {/* Dönem seçici */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rangeRow}>
        {RANGES.map(r => (
          <TouchableOpacity
            key={r}
            style={[s.rangeChip, activeRange === r && s.rangeChipActive]}
            onPress={() => setActiveRange(r)}
            activeOpacity={0.8}
          >
            <Text style={[s.rangeChipText, activeRange === r && s.rangeChipTextActive]}>
              {TEAM_REPORT_RANGE_LABELS[r]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {reportLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : reportError ? (
        <View style={s.errorBox}>
          <MaterialIcons name="error-outline" size={20} color={theme.colors.error} />
          <Text style={s.errorText}>{reportError}</Text>
          <TouchableOpacity onPress={() => loadReport(activeRange)}>
            <Text style={s.retryText}>Tekrar dene</Text>
          </TouchableOpacity>
        </View>
      ) : report ? (
        Object.values(report.sections).map(section => (
          <View key={section.title} style={s.card}>
            <Text style={s.cardTitle}>{section.title}</Text>
            {section.subtitle ? <Text style={s.cardSubtitle}>{section.subtitle}</Text> : null}

            {/* Metrikler */}
            {section.metrics.length > 0 && (
              <View style={s.metricsRow}>
                {section.metrics.map(metric => (
                  <View key={metric.label} style={s.metricItem}>
                    <Text style={s.metricValue}>{metric.value}</Text>
                    <Text style={s.metricLabel}>{metric.label}</Text>
                    {metric.change ? (
                      <Text style={[
                        s.metricChange,
                        metric.change.startsWith('+') ? { color: theme.colors.success } : { color: theme.colors.error },
                      ]}>
                        {metric.change}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {/* Barlar */}
            {section.bars.length > 0 && (
              <View style={s.barsWrap}>
                {(() => {
                  const maxVal = Math.max(...section.bars.map(b => b.value), 1);
                  return section.bars.map(bar => (
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
            )}
          </View>
        ))
      ) : null}

      <View style={{ height: 80 }} />
    </View>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  content:        { paddingTop: 8, paddingBottom: 40 },
  sectionLabel:   { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.8, marginBottom: 12 },
  loadingBox:     { paddingVertical: 32, alignItems: 'center' },
  errorBox:       { paddingVertical: 24, alignItems: 'center', gap: 8 },
  errorText:      { fontSize: 13, color: theme.colors.error, textAlign: 'center' },
  retryText:      { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  emptyBox:       { paddingVertical: 36, alignItems: 'center', gap: 10, backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border },
  emptyText:      { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  totalCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12, ...theme.shadows.sm },
  totalLabel:     { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 4 },
  totalAmount:    { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
  totalIconBg:    { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  card:           { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12, gap: 10 },
  cardTitle:      { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
  cardSubtitle:   { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17, marginTop: -4 },
  catRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot:         { width: 8, height: 8, borderRadius: 4 },
  catLabel:       { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, width: 70 },
  catBarWrap:     { flex: 1, height: 6, backgroundColor: theme.colors.surface2, borderRadius: 3, overflow: 'hidden' },
  catBar:         { height: 6, borderRadius: 3 },
  catAmount:      { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary, width: 80, textAlign: 'right' },
  monthRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  monthLabel:     { fontSize: 14, color: theme.colors.textSecondary },
  monthAmount:    { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  rangeRow:       { gap: 8, paddingBottom: 12, paddingRight: 8 },
  rangeChip:      { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  rangeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  rangeChipText:  { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  rangeChipTextActive: { color: theme.colors.textInverse, fontWeight: '700' },
  metricsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricItem:     { flex: 1, minWidth: 80, backgroundColor: theme.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', gap: 2 },
  metricValue:    { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  metricLabel:    { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, textAlign: 'center' },
  metricChange:   { fontSize: 11, fontWeight: '700' },
  barsWrap:       { gap: 8 },
  barRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:       { fontSize: 12, color: theme.colors.textSecondary, width: 100 },
  barTrack:       { flex: 1, height: 8, backgroundColor: theme.colors.surface2, borderRadius: 4, overflow: 'hidden' },
  barFill:        { height: 8, borderRadius: 4 },
  barValue:       { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary, width: 28, textAlign: 'right' },
}));
