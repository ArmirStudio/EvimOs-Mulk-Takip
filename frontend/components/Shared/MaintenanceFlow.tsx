import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { buildMaintenanceTimeline, formatMaintenanceDate, getMaintenanceStatusTone } from '../../utils/maintenancePresentation';

interface MaintenanceFlowProps {
  request: any;
}

export const MaintenanceFlow: React.FC<MaintenanceFlowProps> = ({ request }) => {
  const theme = useAppTheme();
  const styles = useStyles();
  const steps = buildMaintenanceTimeline(request);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Süreç akışı</Text>
        <Text style={styles.caption}>
          {request?.updated_at ? `Son güncelleme ${formatMaintenanceDate(request.updated_at, 'relative')}` : 'Talep açıldı'}
        </Text>
      </View>

      {steps.map((step, index) => {
        const isDone = step.state === 'done';
        const isActive = step.state === 'active';
        const tone = isDone
          ? getMaintenanceStatusTone(theme, 'completed')
          : isActive
          ? getMaintenanceStatusTone(theme, 'in_progress')
          : {
              backgroundColor: theme.colors.surface2,
              borderColor: theme.colors.border,
              textColor: theme.colors.textMuted,
              accentColor: theme.colors.border,
            };

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.railCol}>
              <View
                style={[
                  styles.stepNode,
                  {
                    backgroundColor: isDone || isActive ? tone.accentColor : theme.colors.surface,
                    borderColor: tone.borderColor,
                  },
                ]}
              >
                <MaterialIcons
                  name={(isDone ? 'check' : step.icon) as any}
                  size={16}
                  color={isDone || isActive ? theme.colors.textInverse : theme.colors.textMuted}
                />
              </View>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor:
                        steps[index + 1].state === 'upcoming' && !isDone
                          ? theme.colors.border
                          : tone.accentColor,
                    },
                  ]}
                />
              )}
            </View>

            <View
              style={[
                styles.stepCard,
                {
                  backgroundColor: tone.backgroundColor,
                  borderColor: tone.borderColor,
                },
              ]}
            >
              <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, { color: isDone || isActive ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
                  {step.title}
                </Text>
                <Text style={styles.stepDate}>{formatMaintenanceDate(step.date, 'datetime')}</Text>
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
              <View style={styles.statePill}>
                <Text style={[styles.statePillText, { color: tone.textColor }]}>
                  {isDone ? 'Tamamlandı' : isActive ? 'Aktif adım' : 'Sıradaki adım'}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
      ...theme.shadows.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    caption: {
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: 'right',
      flexShrink: 1,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
    },
    railCol: {
      width: 28,
      alignItems: 'center',
    },
    stepNode: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    connector: {
      width: 2,
      flex: 1,
      marginVertical: 4,
      borderRadius: 999,
    },
    stepCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      marginBottom: 12,
    },
    stepHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    stepTitle: {
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
    },
    stepDate: {
      fontSize: 11,
      color: theme.colors.textMuted,
      textAlign: 'right',
      maxWidth: 110,
    },
    stepDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 19,
      marginTop: 8,
      marginBottom: 10,
    },
    statePill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
    },
    statePillText: {
      fontSize: 11,
      fontWeight: '700',
    },
  })
);
