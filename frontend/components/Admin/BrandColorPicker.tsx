import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import {
  BRAND_COLOR_PRESETS,
  getContrastTextColor,
  normalizeHexColor,
} from '../../utils/branding';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
};

export default function BrandColorPicker({
  label,
  value,
  onChange,
  helperText,
}: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState(value);

  useEffect(() => {
    setCustomValue(value);
  }, [value]);

  const normalized = normalizeHexColor(value) || theme.colors.primary;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.label}>{label}</Text>
          {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
        </View>

        <View style={[styles.preview, { backgroundColor: normalized }]}>
          <Text style={[styles.previewText, { color: getContrastTextColor(normalized) }]}>
            Aa
          </Text>
        </View>
      </View>

      <View style={styles.paletteWrap}>
        {BRAND_COLOR_PRESETS.map((preset) => {
          const active = normalized === preset;
          return (
            <TouchableOpacity
              key={preset}
              style={[
                styles.swatchButton,
                active && styles.swatchButtonActive,
                { backgroundColor: preset },
              ]}
              onPress={() => onChange(preset)}
              activeOpacity={0.85}
            >
              {active ? (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={getContrastTextColor(preset)}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.customTrigger, showCustomInput && styles.customTriggerActive]}
        onPress={() => setShowCustomInput((current) => !current)}
        activeOpacity={0.85}
      >
        <Ionicons name="color-palette-outline" size={16} color={theme.colors.primary} />
        <Text style={styles.customTriggerText}>Özel renk gir</Text>
      </TouchableOpacity>

      {showCustomInput ? (
        <View style={styles.customInputRow}>
          <TextInput
            style={styles.customInput}
            placeholder="#D4622B"
            placeholderTextColor={theme.colors.textMuted}
            value={customValue}
            onChangeText={(text) => {
              setCustomValue(text);
              const next = normalizeHexColor(text);
              if (next) {
                onChange(next);
              }
            }}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => {
              const next = normalizeHexColor(customValue);
              if (next) {
                onChange(next);
                setCustomValue(next);
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.applyButtonText}>Uygula</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    helper: {
      marginTop: 2,
      fontSize: theme.fontSize.xs,
      color: theme.colors.textMuted,
    },
    preview: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    previewText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
    },
    paletteWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    swatchButton: {
      width: 28,
      height: 28,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.32)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    swatchButtonActive: {
      transform: [{ scale: 1.08 }],
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    customTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    customTriggerActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    customTriggerText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.primary,
    },
    customInputRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    customInput: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textPrimary,
    },
    applyButton: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
    },
    applyButtonText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textInverse,
    },
  })
);
