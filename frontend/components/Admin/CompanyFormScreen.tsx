import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { tr } from '../../app/translations';
import { CompactDatePicker } from '../Shared/CompactDatePicker';
import LocationPicker from '../Shared/LocationPicker';
import BrandColorPicker from './BrandColorPicker';
import { searchTurkeyProvinces } from '../../constants/turkeyProvinces';
import { getContrastTextColor, lightenHex, normalizeHexColor } from '../../utils/branding';

export type CompanyEntityType = 'office' | 'company';

export interface CompanyFormValues {
  entityType: CompanyEntityType;
  name: string;
  location: string;
  district?: string;
  address: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  brandColorPrimary: string;
  brandColorSecondary: string;
  activeRegions: string[];
  subscriptionPlan: 'free' | 'basic' | 'premium';
  maxProperties: string;
  contractStart: string | null;
  contractEnd: string | null;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  status: 'active' | 'suspended' | 'inactive';
}

type Props = {
  title: string;
  submitLabel: string;
  initialValues: CompanyFormValues;
  loading?: boolean;
  saving?: boolean;
  collectDistrict?: boolean;
  onSubmit: (values: CompanyFormValues) => Promise<void>;
};

const ENTITY_OPTIONS: {
  key: CompanyEntityType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'office', title: 'Emlak Ofisi', description: 'Kucuk veya orta ekipli saha ofisi.', icon: 'home-outline' },
  { key: 'company', title: 'Emlak Şirketi', description: 'Daha kurumsal ve çok çalışanlı yapı.', icon: 'business-outline' },
];

export const EMPTY_COMPANY_FORM: CompanyFormValues = {
  entityType: 'office',
  name: '',
  location: '',
  district: '',
  address: '',
  logoUrl: null,
  bannerUrl: null,
  brandColorPrimary: '#D4622B',
  brandColorSecondary: '#2C1810',
  activeRegions: [],
  subscriptionPlan: 'basic',
  maxProperties: '20',
  contractStart: null,
  contractEnd: null,
  contactEmail: '',
  contactPhone: '',
  notes: '',
  status: 'active',
};

export default function CompanyFormScreen({
  title,
  submitLabel,
  initialValues,
  loading = false,
  saving = false,
  collectDistrict = false,
  onSubmit,
}: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [form, setForm] = useState<CompanyFormValues>(initialValues);
  const [locationSearch, setLocationSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showRegionsModal, setShowRegionsModal] = useState(false);
  const [showContractStart, setShowContractStart] = useState(false);
  const [showContractEnd, setShowContractEnd] = useState(false);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const locationOptions = useMemo(() => searchTurkeyProvinces(locationSearch), [locationSearch]);
  const regionOptions = useMemo(() => searchTurkeyProvinces(regionSearch), [regionSearch]);
  const primaryColor = normalizeHexColor(form.brandColorPrimary) || theme.colors.primary;
  const secondaryColor = normalizeHexColor(form.brandColorSecondary) || theme.colors.dark;
  const accentTextColor = getContrastTextColor(primaryColor);

  const pickImage = async (field: 'logoUrl' | 'bannerUrl') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'logoUrl' ? [1, 1] : [16, 9],
      quality: 0.88,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setForm((current) => ({ ...current, [field]: result.assets[0].uri }));
    }
  };

  const toggleRegion = (province: string) => {
    setForm((current) => ({
      ...current,
      activeRegions: current.activeRegions.includes(province)
        ? current.activeRegions.filter((item) => item !== province)
        : [...current.activeRegions, province],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert(tr.common.error, 'Lütfen şirket veya ofis adını girin');
      return;
    }

    if (!form.location.trim()) {
      Alert.alert(tr.common.error, 'Lütfen ofis şehrini seçin');
      return;
    }

    if (collectDistrict && !form.district?.trim()) {
      Alert.alert(tr.common.error, tr.location.districtRequired);
      return;
    }

    if (!form.contactEmail.trim()) {
      Alert.alert(tr.common.error, 'İletişim e-postası girilmeli. Bu e-posta giriş hesabı olarak kullanılacak.');
      return;
    }

    await onSubmit({
      ...form,
      name: form.name.trim(),
      location: form.location.trim(),
      district: collectDistrict ? (form.district || '').trim() : form.district,
      address: form.address.trim(),
      contactEmail: form.contactEmail.trim().toLowerCase(),
      contactPhone: form.contactPhone.trim(),
      notes: form.notes.trim(),
      activeRegions: [...new Set(form.activeRegions)],
      brandColorPrimary: primaryColor,
      brandColorSecondary: secondaryColor,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{tr.admin.loadingCompany}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{title}</Text>
          <TouchableOpacity
            style={[styles.iconButton, styles.saveIconButton, saving && styles.disabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size={18} color={theme.colors.primary} />
            ) : (
              <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SectionCard title="Varlık Tipi">
            <Text style={styles.helperText}>
              Buradan kaydın küçük ofis mi yoksa daha kurumsal bir şirket mi olduğunu seçin.
            </Text>
            <View style={styles.entityGrid}>
              {ENTITY_OPTIONS.map((option) => {
                const active = form.entityType === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.entityCard, active && styles.entityCardActive]}
                    onPress={() => setForm((current) => ({ ...current, entityType: option.key }))}
                    activeOpacity={0.9}
                  >
                    <View style={[styles.entityIcon, active && styles.entityIconActive]}>
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={active ? theme.colors.textInverse : theme.colors.primary}
                      />
                    </View>
                    <Text style={styles.entityTitle}>{option.title}</Text>
                    <Text style={styles.entityDescription}>{option.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          <SectionCard title="Görseller">
            <TouchableOpacity style={styles.bannerBox} onPress={() => pickImage('bannerUrl')} activeOpacity={0.92}>
              {form.bannerUrl ? (
                <Image source={{ uri: form.bannerUrl }} style={styles.bannerImage} />
              ) : (
                <View style={[styles.bannerPlaceholder, { backgroundColor: lightenHex(primaryColor, 0.12) }]}>
                  <View style={[styles.bannerOrb, { backgroundColor: primaryColor }]} />
                  <View style={[styles.bannerStripe, { backgroundColor: secondaryColor }]} />
                  <View style={styles.bannerPatternRow}>
                    <View style={styles.bannerPatternLarge} />
                    <View style={styles.bannerPatternSmall} />
                  </View>
                </View>
              )}
              <View style={styles.bannerOverlay}>
                <View>
                  <Text style={styles.bannerTitle}>Banner Alani</Text>
                  <Text style={styles.bannerCopy}>
                    Marka yuzeyini ve ilk izlenimi guclendiren yatay gorsel.
                  </Text>
                </View>
                <View style={styles.bannerCta}>
                  <Ionicons name="images-outline" size={16} color={theme.colors.textInverse} />
                  <Text style={styles.bannerCtaText}>Banner Değiştir</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.logoRow}>
              <TouchableOpacity style={styles.logoCard} onPress={() => pickImage('logoUrl')} activeOpacity={0.9}>
                {form.logoUrl ? (
                  <Image source={{ uri: form.logoUrl }} style={styles.logoImage} />
                ) : (
                  <View style={[styles.logoPlaceholder, { backgroundColor: primaryColor }]}>
                    <Text style={[styles.logoPlaceholderText, { color: accentTextColor }]}>
                      {(form.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.logoMeta}>
                <Text style={styles.logoMetaTitle}>Logo</Text>
                <Text style={styles.logoMetaText}>
                  Liste kartlarında, profil başlığında ve yönetim alanlarında görünen kare marka görseli.
                </Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage('logoUrl')}>
                  <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.secondaryButtonText}>Logo Değiştir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SectionCard>

          <SectionCard title="Ofis Bilgileri">
            <LabeledInput
              label={form.entityType === 'company' ? 'Şirket Adı' : 'Ofis Adı'}
              value={form.name}
              placeholder={form.entityType === 'company' ? 'Orn: Marmara Gayrimenkul' : 'Orn: Bursa Merkez Ofisi'}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
            />

            {collectDistrict ? (
              <LocationPicker
                province={form.location}
                district={form.district || ''}
                onProvinceChange={(location) =>
                  setForm((current) => ({ ...current, location, district: '' }))
                }
                onDistrictChange={(district) => setForm((current) => ({ ...current, district }))}
                required
                layout="row"
              />
            ) : (
              <TouchableOpacity style={styles.selectField} onPress={() => setShowLocationModal(true)}>
                <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.selectText, !form.location && styles.placeholderText]}>
                  {form.location || 'Ofis sehri sec'}
                </Text>
              </TouchableOpacity>
            )}

            <LabeledInput
              label={tr.admin.address}
              value={form.address}
              placeholder={tr.admin.addressPlaceholder}
              multiline
              onChangeText={(address) => setForm((current) => ({ ...current, address }))}
            />
          </SectionCard>

          <SectionCard title={tr.admin.activeRegions}>
            <Text style={styles.helperText}>
              Ofis sehri sabit kalir. Etkin iller hizmet verilen alanlari temsil eder.
            </Text>
            <TouchableOpacity style={styles.selectField} onPress={() => setShowRegionsModal(true)}>
              <Ionicons name="map-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.selectText, !form.activeRegions.length && styles.placeholderText]}>
                {form.activeRegions.length ? `${form.activeRegions.length} il secildi` : 'Etkin illeri sec'}
              </Text>
            </TouchableOpacity>
            <View style={styles.chipWrap}>
              {form.activeRegions.map((region) => (
                <TouchableOpacity key={region} style={styles.regionChip} onPress={() => toggleRegion(region)}>
                  <Text style={styles.regionChipText}>{region}</Text>
                  <Ionicons name="close" size={14} color={theme.colors.textInverse} />
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          <SectionCard title={tr.admin.brandColors}>
            <Text style={styles.helperText}>
              Seçilen ana renk ileride bu yapıya bağlı kiracı ve ev sahibi ekranlarına da yansıtılır.
            </Text>
            <View style={styles.brandPreviewCard}>
              <View style={[styles.brandPreviewSwatch, { backgroundColor: primaryColor }]}>
                <Text style={[styles.brandPreviewText, { color: accentTextColor }]}>Tenant</Text>
              </View>
              <View style={[styles.brandPreviewSwatch, { backgroundColor: secondaryColor }]}>
                <Text style={[styles.brandPreviewText, { color: getContrastTextColor(secondaryColor) }]}>Landlord</Text>
              </View>
            </View>
            <View style={styles.colorStack}>
              <BrandColorPicker
                label={tr.admin.brandColorPrimary}
                value={form.brandColorPrimary}
                onChange={(brandColorPrimary) => setForm((current) => ({ ...current, brandColorPrimary }))}
                helperText="Ana vurgu, buton ve kart basliklarinda kullanilir."
              />
              <BrandColorPicker
                label={tr.admin.brandColorSecondary}
                value={form.brandColorSecondary}
                onChange={(brandColorSecondary) => setForm((current) => ({ ...current, brandColorSecondary }))}
                helperText="Ikincil arka plan ve denge rengi olarak kullanilir."
              />
            </View>
          </SectionCard>

          <SectionCard title="Plan ve İletişim">
            <Text style={styles.helperText}>
              Girilen e-posta yeni açılan giriş hesabı olur. Deneme süreci için varsayılan şifre: 1234.
            </Text>
            <View style={styles.chipWrap}>
              {(['free', 'basic', 'premium'] as const).map((plan) => {
                const active = form.subscriptionPlan === plan;
                return (
                  <TouchableOpacity
                    key={plan}
                    style={[styles.planChip, active && styles.planChipActive]}
                    onPress={() => setForm((current) => ({ ...current, subscriptionPlan: plan }))}
                  >
                    <Text style={[styles.planChipText, active && styles.planChipTextActive]}>
                      {plan === 'free' ? tr.admin.planFree : plan === 'basic' ? tr.admin.planBasic : tr.admin.planPremium}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <LabeledInput
              label={tr.admin.maxProperties}
              value={form.maxProperties}
              placeholder="20"
              keyboardType="number-pad"
              onChangeText={(maxProperties) => setForm((current) => ({ ...current, maxProperties }))}
            />

            <View style={styles.twoCol}>
              <DateField
                label={tr.admin.contractStart}
                value={form.contractStart}
                onPress={() => setShowContractStart(true)}
              />
              <DateField
                label={tr.admin.contractEnd}
                value={form.contractEnd}
                onPress={() => setShowContractEnd(true)}
              />
            </View>

            <LabeledInput
              label="Giriş E-postası"
              value={form.contactEmail}
              placeholder="email@ornek.com"
              keyboardType="email-address"
              onChangeText={(contactEmail) => setForm((current) => ({ ...current, contactEmail }))}
            />
            <LabeledInput
              label={tr.admin.contactPhone}
              value={form.contactPhone}
              placeholder="+90 555 000 00 00"
              keyboardType="phone-pad"
              onChangeText={(contactPhone) => setForm((current) => ({ ...current, contactPhone }))}
            />
            <LabeledInput
              label={tr.admin.adminNotes}
              value={form.notes}
              placeholder="Not ekle"
              multiline
              onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
            />
          </SectionCard>

          <SectionCard title={tr.admin.companyStatus}>
            <View style={styles.chipWrap}>
              {(['active', 'suspended', 'inactive'] as const).map((status) => {
                const active = form.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.planChip, active && styles.planChipActive]}
                    onPress={() => setForm((current) => ({ ...current, status }))}
                  >
                    <Text style={[styles.planChipText, active && styles.planChipTextActive]}>
                      {status === 'active' ? tr.admin.statusActive : status === 'suspended' ? tr.admin.statusSuspended : tr.admin.statusInactive}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={theme.colors.textInverse} /> : <Text style={styles.saveButtonText}>{submitLabel}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <CompactDatePicker
        visible={showContractStart}
        onClose={() => setShowContractStart(false)}
        onSelect={(contractStart) => {
          setForm((current) => ({ ...current, contractStart }));
          setShowContractStart(false);
        }}
        currentValue={form.contractStart ?? undefined}
        mode="date"
        title={tr.admin.contractStart}
      />

      <CompactDatePicker
        visible={showContractEnd}
        onClose={() => setShowContractEnd(false)}
        onSelect={(contractEnd) => {
          setForm((current) => ({ ...current, contractEnd }));
          setShowContractEnd(false);
        }}
        currentValue={form.contractEnd ?? undefined}
        mode="date"
        title={tr.admin.contractEnd}
      />

      <SelectionModal
        visible={showLocationModal}
        title="Ofis Sehri"
        searchValue={locationSearch}
        onSearchChange={setLocationSearch}
        onClose={() => setShowLocationModal(false)}
      >
        {locationOptions.map((province) => (
          <OptionRow
            key={province}
            label={province}
            active={form.location === province}
            onPress={() => {
              setForm((current) => ({ ...current, location: province }));
              setShowLocationModal(false);
              setLocationSearch('');
            }}
          />
        ))}
      </SelectionModal>

      <SelectionModal
        visible={showRegionsModal}
        title="Etkin Iller"
        searchValue={regionSearch}
        onSearchChange={setRegionSearch}
        onClose={() => setShowRegionsModal(false)}
        footer={(
          <TouchableOpacity style={styles.modalDoneButton} onPress={() => setShowRegionsModal(false)}>
            <Text style={styles.modalDoneButtonText}>Tamam</Text>
          </TouchableOpacity>
        )}
      >
        {regionOptions.map((province) => (
          <OptionRow
            key={province}
            label={province}
            active={form.activeRegions.includes(province)}
            multi
            onPress={() => toggleRegion(province)}
          />
        ))}
      </SelectionModal>
    </SafeAreaView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LabeledInput(props: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
}) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.multilineInput]}
        placeholder={props.placeholder}
        placeholderTextColor={theme.colors.textMuted}
        value={props.value}
        onChangeText={props.onChangeText}
        multiline={props.multiline}
        keyboardType={props.keyboardType}
      />
    </View>
  );
}

function DateField({ label, value, onPress }: { label: string; value: string | null; onPress: () => void }) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.flexField}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectField} onPress={onPress}>
        <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
        <Text style={[styles.selectText, !value && styles.placeholderText]}>
          {value ? new Date(`${value}T00:00:00`).toLocaleDateString('tr-TR') : 'Tarih sec'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SelectionModal({
  visible,
  title,
  searchValue,
  onSearchChange,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const styles = useStyles();
  const theme = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Il ara..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchValue}
              onChangeText={onSearchChange}
              autoCorrect={false}
              autoCapitalize="words"
            />
            <ScrollView
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer}
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
  multi = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  multi?: boolean;
}) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <TouchableOpacity style={[styles.optionRow, active && styles.optionRowActive]} onPress={onPress}>
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
      <Ionicons
        name={multi ? (active ? 'checkbox' : 'square-outline') : active ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={active ? theme.colors.success : theme.colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary, fontSize: theme.fontSize.md },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    saveIconButton: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primaryLight },
    topTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    scroll: { padding: theme.spacing.md, paddingBottom: 100, gap: theme.spacing.md },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
    helperText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, lineHeight: 20, marginBottom: theme.spacing.md },
    entityGrid: { gap: theme.spacing.sm },
    entityCard: { borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md, backgroundColor: theme.colors.background },
    entityCardActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
    entityIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
    entityIconActive: { backgroundColor: theme.colors.primary },
    entityTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    entityDescription: { marginTop: 4, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 19 },
    bannerBox: { height: 196, borderRadius: theme.borderRadius.xl, overflow: 'hidden' },
    bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    bannerPlaceholder: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', justifyContent: 'space-between', padding: theme.spacing.lg },
    bannerOrb: { position: 'absolute', top: -30, right: -16, width: 140, height: 140, borderRadius: 70, opacity: 0.85 },
    bannerStripe: { position: 'absolute', bottom: -24, left: -10, width: 220, height: 90, borderRadius: 32, opacity: 0.24, transform: [{ rotate: '-8deg' }] },
    bannerPatternRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xl },
    bannerPatternLarge: { width: 88, height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.26)' },
    bannerPatternSmall: { width: 38, height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)' },
    bannerOverlay: { flex: 1, justifyContent: 'space-between', padding: theme.spacing.lg, backgroundColor: 'rgba(24, 15, 10, 0.34)' },
    bannerTitle: { color: theme.colors.textInverse, fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold },
    bannerCopy: { marginTop: 4, color: 'rgba(255,252,248,0.78)', fontSize: theme.fontSize.sm, lineHeight: 20, maxWidth: '78%' },
    bannerCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: theme.borderRadius.round, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
    bannerCtaText: { color: theme.colors.textInverse, fontWeight: theme.fontWeight.semibold, fontSize: theme.fontSize.sm },
    logoRow: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.md },
    logoCard: { width: 96, height: 96, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
    logoImage: { width: '100%', height: '100%' },
    logoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    logoPlaceholderText: { fontSize: theme.fontSize.xxxl, fontWeight: theme.fontWeight.bold },
    logoMeta: { flex: 1, gap: theme.spacing.sm },
    logoMetaTitle: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    logoMetaText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 20 },
    secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.round, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
    secondaryButtonText: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold },
    inputBlock: { marginBottom: theme.spacing.md },
    label: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
    input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
    multilineInput: { minHeight: 96, textAlignVertical: 'top' },
    selectField: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, marginBottom: theme.spacing.md },
    selectText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
    placeholderText: { color: theme.colors.textMuted },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    regionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.round },
    regionChipText: { color: theme.colors.textInverse, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold },
    brandPreviewCard: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
    brandPreviewSwatch: { flex: 1, minHeight: 74, borderRadius: theme.borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
    brandPreviewText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
    colorStack: { gap: theme.spacing.lg },
    planChip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.round, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
    planChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    planChipText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold },
    planChipTextActive: { color: theme.colors.textInverse },
    twoCol: { flexDirection: 'row', gap: theme.spacing.md },
    flexField: { flex: 1 },
    saveButton: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.md, ...theme.shadows.md },
    saveButtonText: { color: theme.colors.textInverse, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
    disabled: { opacity: 0.6 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
    modalScrim: { ...StyleSheet.absoluteFillObject },
    modalKeyboard: { justifyContent: 'flex-end', paddingHorizontal: theme.spacing.md, paddingBottom: Platform.OS === 'ios' ? theme.spacing.lg : theme.spacing.md },
    modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, maxHeight: '82%', paddingBottom: theme.spacing.md },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    modalTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    modalSearch: { marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
    modalList: { maxHeight: 420, paddingHorizontal: theme.spacing.md },
    optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    optionRowActive: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.lg },
    optionText: { color: theme.colors.textPrimary, fontSize: theme.fontSize.md },
    optionTextActive: { color: theme.colors.primary, fontWeight: theme.fontWeight.semibold },
    modalDoneButton: { marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, alignItems: 'center', paddingVertical: theme.spacing.md },
    modalDoneButtonText: { color: theme.colors.textInverse, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
  })
);
