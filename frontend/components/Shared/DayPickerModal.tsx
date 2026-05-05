import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { tr } from '../../app/translations';

interface DayPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (day: number) => void;
  currentValue?: number;
  title?: string;
  maxDay?: number;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.modalBackdrop,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  calCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  calCellActive: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
  },
  calCellDisabled: {
    opacity: 0.35,
  },
  calDayText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  calDayTextActive: {
    color: theme.colors.textInverse,
    fontWeight: theme.fontWeight.bold,
  },
  calDayTextDisabled: {
    color: theme.colors.textMuted,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
  },
  warningText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    flex: 1,
  },
}));

export default function DayPickerModal({
  visible,
  onClose,
  onSelect,
  currentValue,
  title = 'Gün Seçin',
  maxDay = 31,
}: DayPickerModalProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rawStartDay = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = rawStartDay === 0 ? 6 : rawStartDay - 1;

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    if (day <= maxDay) {
      onSelect(day);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centered}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Kapat">
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavBtn} accessibilityLabel="Önceki ay">
              <Ionicons name="chevron-back" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavBtn} accessibilityLabel="Sonraki ay">
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map(day => (
              <Text key={day} style={styles.weekdayLabel}>{day}</Text>
            ))}
          </View>

          <View style={styles.calGrid}>
            {Array.from({ length: startOffset }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.calCell} />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isSelected = currentValue === day;
              const isDisabled = day > maxDay;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.calCell,
                    isSelected && styles.calCellActive,
                    isDisabled && styles.calCellDisabled,
                  ]}
                  onPress={() => handleSelectDay(day)}
                  disabled={isDisabled}
                  accessibilityLabel={`${day}. gün`}
                >
                  <Text
                    style={[
                      styles.calDayText,
                      isSelected && styles.calDayTextActive,
                      isDisabled && styles.calDayTextDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {currentValue && currentValue >= 29 && (
            <View style={styles.warningRow}>
              <Ionicons name="information-circle-outline" size={14} color={theme.colors.warning} />
              <Text style={styles.warningText}>{tr.common.dayPickerWarning}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
