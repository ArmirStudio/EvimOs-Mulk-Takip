import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../../app/theme';

interface StepIndicatorProps {
  steps?: string[];
  labels?: string[];
  totalSteps?: number;
  currentStep: number;
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    step: {
      flex: 1,
      alignItems: 'center',
    },
    circle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    activeCircle: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    completedCircle: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    label: {
      marginTop: 8,
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    activeLabel: {
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    completedLabel: {
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    connector: {
      flex: 1,
      height: 2,
      backgroundColor: theme.colors.border,
      marginHorizontal: 8,
      marginBottom: 24,
    },
  })
);

export function StepIndicator({ steps, labels, totalSteps, currentStep }: StepIndicatorProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const resolvedSteps = steps ?? labels ?? Array.from(
    { length: totalSteps ?? 0 },
    (_, index) => `Step ${index + 1}`
  );
  const normalizedCurrentStep = steps ? currentStep : Math.max(currentStep - 1, 0);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {resolvedSteps.map((step, index) => {
          const isCompleted = index < normalizedCurrentStep;
          const isActive = index === normalizedCurrentStep;

          return (
            <React.Fragment key={step}>
              <View style={styles.step}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.completedCircle,
                    isActive && styles.activeCircle,
                  ]}
                >
                  {isCompleted && <MaterialIcons name="check" size={14} color={theme.colors.textInverse} />}
                </View>
                <Text
                  style={[
                    styles.label,
                    isCompleted && styles.completedLabel,
                    isActive && styles.activeLabel,
                  ]}
                >
                  {step}
                </Text>
              </View>
              {index < resolvedSteps.length - 1 && <View style={styles.connector} />}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

export default StepIndicator;
