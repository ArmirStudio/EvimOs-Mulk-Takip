import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createThemedStyles, useAppTheme } from '../../app/theme';

export type WheelTimePickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  title: string;
  minuteStep?: number;
};

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function parseTime(value?: string) {
  const [hourRaw, minuteRaw] = (value || '09:00').split(':');
  const hour = clamp(Number(hourRaw) || 9, 0, 23);
  const minute = clamp(Number(minuteRaw) || 0, 0, 59);
  return { hour, minute };
}

type WheelColumnProps = {
  values: number[];
  selectedValue: number;
  onChange: (value: number) => void;
};

function WheelColumn({ values, selectedValue, onChange }: WheelColumnProps) {
  const styles = useStyles();
  const listRef = useRef<FlatList<number>>(null);
  const selectedIndex = Math.max(values.indexOf(selectedValue), 0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 30);

    return () => clearTimeout(timeout);
  }, [selectedIndex]);

  const onScrollEnd = (offsetY: number) => {
    const nextIndex = clamp(Math.round(offsetY / ITEM_HEIGHT), 0, values.length - 1);
    onChange(values[nextIndex]);
  };

  const renderItem = ({ item }: ListRenderItemInfo<number>) => {
    const selected = item === selectedValue;
    return (
      <View style={styles.wheelItem}>
        <Text style={[styles.wheelItemText, selected && styles.wheelItemTextSelected]}>{pad(item)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.wheelColumn}>
      <FlatList
        ref={listRef}
        data={values}
        keyExtractor={(item) => String(item)}
        renderItem={renderItem}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={styles.wheelContent}
        onMomentumScrollEnd={(event) => onScrollEnd(event.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(event) => onScrollEnd(event.nativeEvent.contentOffset.y)}
      />
      <View pointerEvents="none" style={styles.selectionWindow} />
    </View>
  );
}

export default function WheelTimePickerSheet({
  visible,
  onClose,
  value,
  onChange,
  title,
  minuteStep = 5,
}: WheelTimePickerSheetProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const minuteValues = useMemo(() => {
    const step = Math.max(1, minuteStep);
    const values: number[] = [];
    for (let minute = 0; minute < 60; minute += step) {
      values.push(minute);
    }
    return values;
  }, [minuteStep]);

  const [draftHour, setDraftHour] = useState(9);
  const [draftMinute, setDraftMinute] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const parsed = parseTime(value);
    const normalizedMinute =
      minuteValues.find((item) => item === parsed.minute) ??
      minuteValues.reduce((closest, item) => (
        Math.abs(item - parsed.minute) < Math.abs(closest - parsed.minute) ? item : closest
      ), minuteValues[0] ?? 0);

    setDraftHour(parsed.hour);
    setDraftMinute(normalizedMinute);
  }, [minuteValues, value, visible]);

  const handleSave = () => {
    onChange(`${pad(draftHour)}:${pad(draftMinute)}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={22} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Seçilen saat</Text>
            <Text style={styles.previewValue}>{pad(draftHour)}:{pad(draftMinute)}</Text>
          </View>

          <View style={styles.wheelsRow}>
            <View style={styles.wheelSection}>
              <Text style={styles.wheelLabel}>Saat</Text>
              <WheelColumn
                values={Array.from({ length: 24 }, (_, index) => index)}
                selectedValue={draftHour}
                onChange={setDraftHour}
              />
            </View>
            <Text style={styles.separator}>:</Text>
            <View style={styles.wheelSection}>
              <Text style={styles.wheelLabel}>Dakika</Text>
              <WheelColumn
                values={minuteValues}
                selectedValue={draftMinute}
                onChange={setDraftMinute}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.confirmButton} onPress={handleSave}>
            <Text style={styles.confirmButtonText}>Saati Uygula</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.modalBackdrop,
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingHorizontal: 18,
      paddingTop: 10,
      gap: 16,
      ...theme.shadows.lg,
    },
    handle: {
      alignSelf: 'center',
      width: 46,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface2,
    },
    previewCard: {
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    previewLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    previewValue: {
      marginTop: 6,
      fontSize: 26,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    wheelsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    wheelSection: {
      flex: 1,
      alignItems: 'center',
      gap: 10,
    },
    wheelLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    separator: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginTop: 22,
    },
    wheelColumn: {
      width: '100%',
      height: PICKER_HEIGHT,
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      position: 'relative',
    },
    wheelContent: {
      paddingVertical: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
    },
    wheelItem: {
      height: ITEM_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelItemText: {
      fontSize: 22,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    wheelItemTextSelected: {
      color: theme.colors.textPrimary,
      fontWeight: '800',
    },
    selectionWindow: {
      position: 'absolute',
      left: 10,
      right: 10,
      top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
      height: ITEM_HEIGHT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}44`,
      backgroundColor: theme.colors.primaryLight,
    },
    confirmButton: {
      minHeight: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    confirmButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.textInverse,
    },
  }),
);
