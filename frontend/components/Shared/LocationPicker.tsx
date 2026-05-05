import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { getDistricts, searchDistricts, searchProvinces } from '@shared/turkeyLocations';
import { tr } from '../../app/translations';

type LayoutMode = 'stacked' | 'row';

type LocationPickerProps = {
  province: string;
  district: string;
  onProvinceChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  provinceLabel?: string;
  districtLabel?: string;
  provincePlaceholder?: string;
  districtPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  layout?: LayoutMode;
};

function SelectionModal({
  visible,
  title,
  searchValue,
  placeholder,
  onSearchChange,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  searchValue: string;
  placeholder: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const s = useStyles();
  const theme = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <Pressable style={s.modalScrim} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalKeyboard}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.modalSearch}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textMuted}
              value={searchValue}
              onChangeText={onSearchChange}
              autoCorrect={false}
              autoCapitalize="words"
            />
            <ScrollView style={s.modalList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function OptionRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const s = useStyles();
  const theme = useAppTheme();

  return (
    <TouchableOpacity style={[s.optionRow, active && s.optionRowActive]} onPress={onPress}>
      <Text style={[s.optionText, active && s.optionTextActive]}>{label}</Text>
      <Ionicons
        name={active ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={active ? theme.colors.success : theme.colors.textMuted}
      />
    </TouchableOpacity>
  );
}

export default function LocationPicker({
  province,
  district,
  onProvinceChange,
  onDistrictChange,
  provinceLabel,
  districtLabel,
  provincePlaceholder,
  districtPlaceholder,
  required = false,
  disabled = false,
  layout = 'stacked',
}: LocationPickerProps) {
  const s = useStyles();
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  const provinceOptions = useMemo(() => searchProvinces(provinceSearch), [provinceSearch]);
  const districtOptions = useMemo(() => searchDistricts(province, districtSearch), [province, districtSearch]);
  const hasProvince = province.trim().length > 0;
  const districtDisabled = disabled || !hasProvince;
  const resolvedLayout: LayoutMode = layout === 'row' && width >= 430 ? 'row' : 'stacked';

  const handleProvinceSelect = (value: string) => {
    if (value !== province) {
      onProvinceChange(value);
      onDistrictChange('');
    }
    setProvinceSearch('');
    setShowProvinceModal(false);
  };

  const handleDistrictSelect = (value: string) => {
    onDistrictChange(value);
    setDistrictSearch('');
    setShowDistrictModal(false);
  };

  return (
    <View style={[s.wrapper, resolvedLayout === 'row' && s.row]}>
      <View style={[s.block, resolvedLayout === 'row' && s.rowItem]}>
        <Text style={s.label}>
          {provinceLabel || tr.location.province}
          {required ? ' *' : ''}
        </Text>
        <TouchableOpacity
          style={[s.selectField, disabled && s.disabledField]}
          onPress={() => !disabled && setShowProvinceModal(true)}
          activeOpacity={0.85}
          disabled={disabled}
        >
          <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
          <Text style={[s.selectText, !province && s.placeholderText]}>
            {province || provincePlaceholder || tr.location.selectProvince}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[s.block, resolvedLayout === 'row' && s.rowItem]}>
        <Text style={s.label}>
          {districtLabel || tr.location.district}
          {required ? ' *' : ''}
        </Text>
        <TouchableOpacity
          style={[s.selectField, districtDisabled && s.disabledField]}
          onPress={() => !districtDisabled && setShowDistrictModal(true)}
          activeOpacity={0.85}
          disabled={districtDisabled}
        >
          <Ionicons name="navigate-outline" size={18} color={districtDisabled ? theme.colors.textMuted : theme.colors.primary} />
          <Text style={[s.selectText, !district && s.placeholderText]}>
            {district || (hasProvince ? districtPlaceholder || tr.location.selectDistrict : tr.location.selectProvinceFirst)}
          </Text>
        </TouchableOpacity>
      </View>

      <SelectionModal
        visible={showProvinceModal}
        title={provinceLabel || tr.location.province}
        searchValue={provinceSearch}
        placeholder={tr.location.searchProvince}
        onSearchChange={setProvinceSearch}
        onClose={() => {
          setProvinceSearch('');
          setShowProvinceModal(false);
        }}
      >
        {provinceOptions.map((item) => (
          <OptionRow key={item} label={item} active={province === item} onPress={() => handleProvinceSelect(item)} />
        ))}
      </SelectionModal>

      <SelectionModal
        visible={showDistrictModal}
        title={districtLabel || tr.location.district}
        searchValue={districtSearch}
        placeholder={tr.location.searchDistrict}
        onSearchChange={setDistrictSearch}
        onClose={() => {
          setDistrictSearch('');
          setShowDistrictModal(false);
        }}
      >
        {(districtOptions.length > 0 ? districtOptions : getDistricts(province)).map((item) => (
          <OptionRow key={item} label={item} active={district === item} onPress={() => handleDistrictSelect(item)} />
        ))}
      </SelectionModal>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    wrapper: {
      gap: theme.spacing.md,
      width: '100%',
      alignSelf: 'stretch',
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      width: '100%',
    },
    rowItem: {
      flex: 1,
      minWidth: 0,
    },
    block: {
      gap: 8,
      minWidth: 0,
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    selectField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 54,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      width: '100%',
    },
    disabledField: {
      opacity: 0.7,
    },
    selectText: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.md,
    },
    placeholderText: {
      color: theme.colors.textMuted,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    modalScrim: {
      ...StyleSheet.absoluteFillObject,
    },
    modalKeyboard: {
      justifyContent: 'flex-end',
    },
    modalCard: {
      maxHeight: '78%',
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    modalTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    modalSearch: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      color: theme.colors.textPrimary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    modalList: {
      maxHeight: 420,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    optionRowActive: {
      backgroundColor: theme.colors.primaryLight,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.sm,
      marginHorizontal: -theme.spacing.sm,
    },
    optionText: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.medium,
    },
    optionTextActive: {
      color: theme.colors.primary,
    },
  })
);
