import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../../app/theme';

interface CompactDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  currentValue?: string;
  mode?: 'date' | 'month';
  title?: string;
}

const MONTH_NAMES = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
const DAY_NAMES = ['Pt', 'Sa', 'Ca', 'Pe', 'Cu', 'Ct', 'Pa'];

export function CompactDatePicker({
  visible,
  onClose,
  onSelect,
  currentValue,
  mode = 'date',
  title,
}: CompactDatePickerProps) {
  const styles = useStyles();
  const theme = useAppTheme();
  const initialDate = useMemo(() => {
    if (currentValue) {
      const [year, month, day] = currentValue.split('-');
      return new Date(Number(year), Number(month) - 1, day ? Number(day) : 1);
    }
    return new Date();
  }, [currentValue]);

  const [viewDate, setViewDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showYearGrid, setShowYearGrid] = useState(false);

  useEffect(() => {
    setViewDate(initialDate);
    setSelectedDate(initialDate);
  }, [initialDate, visible]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const emptyDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const yearOptions = Array.from({ length: 15 }, (_, index) => year - 7 + index);

  const changeMonth = (delta: number) => setViewDate(new Date(year, month + delta, 1));
  const changeYearRange = (delta: number) => setViewDate(new Date(year + delta, month, 1));

  const handleDaySelect = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    onSelect(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    onClose();
  };

  const handleMonthSelect = (monthIndex: number) => {
    if (mode === 'month') {
      onSelect(`${year}-${String(monthIndex + 1).padStart(2, '0')}`);
      onClose();
      return;
    }
    setViewDate(new Date(year, monthIndex, 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title || (mode === 'date' ? 'Tarih Seçin' : 'Ay Seçin')}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
              <MaterialIcons name="chevron-left" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <View style={styles.monthYear}>
              <Text style={styles.monthName}>{MONTH_NAMES[month]}</Text>
              <TouchableOpacity onPress={() => setShowYearGrid((current) => !current)}>
                <Text style={styles.yearName}>{year} sec</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {showYearGrid ? (
            <>
              <View style={styles.yearRangeHeader}>
                <TouchableOpacity onPress={() => changeYearRange(-10)} style={styles.rangeButton}>
                  <Text style={styles.rangeButtonText}>-10 Yil</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeYearRange(10)} style={styles.rangeButton}>
                  <Text style={styles.rangeButtonText}>+10 Yil</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.yearGrid}>
                {yearOptions.map((option) => {
                  const active = option === year;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.yearCell, active && styles.selectedYear]}
                      onPress={() => {
                        setViewDate(new Date(option, month, 1));
                        setShowYearGrid(false);
                      }}
                    >
                      <Text style={[styles.yearCellText, active && styles.selectedYearText]}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : mode === 'date' ? (
            <View>
              <View style={styles.dayNames}>
                {DAY_NAMES.map((day) => (
                  <Text key={day} style={styles.dayNameLabel}>{day}</Text>
                ))}
              </View>
              <View style={styles.daysGrid}>
                {Array.from({ length: emptyDays }).map((_, index) => (
                  <View key={`empty-${index}`} style={styles.dayCell} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const isSelected =
                    selectedDate.getDate() === day &&
                    selectedDate.getMonth() === month &&
                    selectedDate.getFullYear() === year;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayCell, isSelected && styles.selectedDay]}
                      onPress={() => handleDaySelect(day)}
                    >
                      <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.monthsGrid}>
              {MONTH_NAMES.map((name, index) => {
                const active = currentValue === `${year}-${String(index + 1).padStart(2, '0')}`;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.monthCell, active && styles.selectedMonth]}
                    onPress={() => handleMonthSelect(index)}
                  >
                    <Text style={[styles.monthText, active && styles.selectedMonthText]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Iptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.modalBackdrop },
    backdrop: { ...StyleSheet.absoluteFillObject },
    modalContent: { width: Dimensions.get('window').width * 0.9, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, ...theme.shadows.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: theme.colors.primaryLight, padding: 10, borderRadius: 12 },
    navBtn: { padding: 5 },
    monthYear: { alignItems: 'center' },
    monthName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
    yearName: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    yearRangeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    rangeButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
    rangeButtonText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary },
    yearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
    yearCell: { width: '30%', height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
    selectedYear: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    yearCellText: { fontSize: 14, color: theme.colors.textPrimary },
    selectedYearText: { color: theme.colors.textInverse, fontWeight: 'bold' },
    dayNames: { flexDirection: 'row', marginBottom: 10 },
    dayNameLabel: { flex: 1, textAlign: 'center', color: theme.colors.textMuted, fontSize: 12, fontWeight: 'bold' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
    dayText: { fontSize: 14, color: theme.colors.textPrimary },
    selectedDay: { backgroundColor: theme.colors.primary },
    selectedDayText: { color: theme.colors.textInverse, fontWeight: 'bold' },
    monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    monthCell: { width: '30%', height: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
    monthText: { fontSize: 14, color: theme.colors.textPrimary },
    selectedMonth: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    selectedMonthText: { color: theme.colors.textInverse, fontWeight: 'bold' },
    footer: { marginTop: 20, alignItems: 'flex-end' },
    cancelBtn: { padding: 10 },
    cancelBtnText: { color: theme.colors.textSecondary, fontWeight: 'bold' },
  })
);
