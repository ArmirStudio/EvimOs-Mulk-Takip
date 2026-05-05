import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../../app/theme';

export interface DashboardStatCardProps {
  title: string;
  value: string | number;
  iconName: any;
  iconColor: string;
  dotColor?: string;
  backgroundColor?: string;
  textColor?: string;
  iconSize?: number;
  onPress?: () => void;
}

export function DashboardStatCard({
  title,
  value,
  iconName,
  iconColor,
  dotColor,
  backgroundColor,
  textColor,
  iconSize = 20,
  onPress,
}: DashboardStatCardProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const cardBg = backgroundColor ?? theme.colors.surface;
  const labelColor = textColor ?? theme.colors.textPrimary;
  const mutedLabelColor = textColor === theme.colors.textInverse
    ? 'rgba(245,241,234,0.7)'
    : theme.colors.textSecondary;

  const content = (
    <View style={[styles.statCard, { backgroundColor: cardBg }]}>
      <View style={styles.statHeader}>
        {dotColor && <View style={[styles.statDot, { backgroundColor: dotColor }]} />}
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
      </View>
      <Text style={[styles.statValue, { color: labelColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: mutedLabelColor }]}>{title}</Text>
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }

  return content;
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    statCard: {
      flex: 1,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minWidth: '45%',
      ...theme.shadows.sm,
    },
    statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    statDot: { width: 8, height: 8, borderRadius: 4 },
    statValue: { fontSize: 28, fontWeight: '700' },
    statLabel: { fontSize: 13, marginTop: 2 },
  }),
);
