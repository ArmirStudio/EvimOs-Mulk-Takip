import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import type { TeamReportPayload, TeamReportRange, TeamReportSection } from '../../services/teamTypes';
import { getReportBarTone, TEAM_REPORT_RANGE_LABELS } from '../../utils/teamPresentation';

type TeamReportPanelProps = {
  payload: TeamReportPayload;
  range: TeamReportRange;
  onRangeChange: (range: TeamReportRange) => void;
};

function ReportSectionCard({ section }: { section: TeamReportSection }) {
  const theme = useAppTheme();
  const styles = useStyles();
  const maxValue = Math.max(...section.bars.map((item) => item.value), 1);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>

      <View style={styles.metricGrid}>
        {section.metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
            {!!metric.change && <Text style={styles.metricChange}>{metric.change}</Text>}
          </View>
        ))}
      </View>

      <View style={styles.barChart}>
        {section.bars.map((bar) => (
          <View key={bar.label} style={styles.barColumn}>
            <Text style={styles.barValue}>{bar.value}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: `${bar.value > 0 ? Math.max((bar.value / maxValue) * 100, 8) : 0}%` as never,
                    backgroundColor: getReportBarTone(theme, bar.tone),
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{bar.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function TeamReportPanel({ payload, range, onRangeChange }: TeamReportPanelProps) {
  const styles = useStyles();
  const ranges = Object.keys(TEAM_REPORT_RANGE_LABELS) as TeamReportRange[];

  return (
    <View style={styles.container}>
      <View style={styles.rangeRow}>
        {ranges.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.rangeChip, range === item && styles.rangeChipActive]}
            onPress={() => onRangeChange(item)}
            activeOpacity={0.85}
          >
            <Text style={[styles.rangeChipText, range === item && styles.rangeChipTextActive]}>
              {TEAM_REPORT_RANGE_LABELS[item]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ReportSectionCard section={payload.sections.teamPerformance} />
      <ReportSectionCard section={payload.sections.propertyStatus} />
      <ReportSectionCard section={payload.sections.operationsHealth} />
      <ReportSectionCard section={payload.sections.maintenanceHealth} />
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: {
      gap: 14,
      paddingBottom: 20,
    },
    rangeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    rangeChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    rangeChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    rangeChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    rangeChipTextActive: {
      color: theme.colors.textInverse,
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 6,
      lineHeight: 18,
    },
    metricGrid: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      marginBottom: 18,
    },
    metricCard: {
      flex: 1,
      backgroundColor: theme.colors.surface2,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    metricValue: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginTop: 10,
    },
    metricChange: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 6,
    },
    barChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 148,
      gap: 10,
    },
    barColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    barValue: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    barTrack: {
      width: '100%',
      maxWidth: 36,
      height: 92,
      borderRadius: 14,
      backgroundColor: theme.colors.surface2,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      borderRadius: 14,
      minHeight: 8,
    },
    barLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
  })
);
