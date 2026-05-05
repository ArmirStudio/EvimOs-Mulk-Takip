import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../theme';
import BrandColorPicker from '../../components/Admin/BrandColorPicker';
import { tr } from '../translations';
import { createAdminStandaloneAgent, uploadAdminPublicFile } from '../../services/appApi';
import { normalizeHexColor, getContrastTextColor } from '../../utils/branding';
import LocationPicker from '../../components/Shared/LocationPicker';

const TRIAL_PASSWORD = '1234';

export default function CreateAgentScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#D4622B');
  const [secondaryColor, setSecondaryColor] = useState('#2C1810');

  const normalizedPrimary = normalizeHexColor(primaryColor) || theme.colors.primary;
  const initials = useMemo(
    () =>
      fullName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [fullName]
  );

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Hata', 'Ad soyad ve e-posta zorunludur.');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Hata', tr.location.provinceRequired);
      return;
    }

    if (!district.trim()) {
      Alert.alert('Hata', tr.location.districtRequired);
      return;
    }

    setSaving(true);
    try {
      let uploadedAvatar: string | null = null;
      if (avatarUri && !/^https?:\/\//i.test(avatarUri)) {
        const upload = await uploadAdminPublicFile({
          bucket: 'avatars',
          path: `standalone/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`,
          fileUri: avatarUri,
          contentType: 'image/jpeg',
          upsert: true,
          folder: 'standalone',
        });
        uploadedAvatar = upload.public_url;
      }

      await createAdminStandaloneAgent({
        email: email.trim().toLowerCase(),
        password: TRIAL_PASSWORD,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        city: city.trim(),
        district: district.trim(),
        avatar_url: uploadedAvatar,
        brand_color_primary: normalizedPrimary,
        brand_color_secondary: normalizeHexColor(secondaryColor),
      });

      Alert.alert(
        'Basarili',
        `Bağımsız emlakçı oluşturuldu. Giriş e-postası: ${email.trim().toLowerCase()} | Varsayılan şifre: ${TRIAL_PASSWORD}`,
        [{ text: 'Tamam', onPress: () => router.replace('/admin/companies') }]
      );
    } catch (error: any) {
      console.error('Create standalone agent error:', error);
      Alert.alert('Hata', error?.message || 'Kayıt oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Bağımsız Emlakçı Oluştur</Text>
          <TouchableOpacity
            style={[styles.iconButton, styles.saveButtonSmall, saving && styles.disabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size={18} color={theme.colors.primary} /> : <Ionicons name="checkmark" size={22} color={theme.colors.primary} />}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <TouchableOpacity style={styles.avatarButton} onPress={handlePickAvatar} activeOpacity={0.85}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: normalizedPrimary }]}>
                  <Text style={[styles.avatarText, { color: getContrastTextColor(normalizedPrimary) }]}>
                    {initials || '?'}
                  </Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color={theme.colors.textInverse} />
              </View>
            </TouchableOpacity>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{fullName || 'Bağımsız Emlakçı'}</Text>
              <Text style={styles.heroText}>
                Bu kayıt bir şirket veya ofise bağlanmaz. Marka renkleri bu emlakçıya ait tenant ve ev sahibi ekranlarına akar.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
            <Field label="Ad Soyad" value={fullName} onChangeText={setFullName} />
            <Field label="Giriş E-postası" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <LocationPicker
              province={city}
              district={district}
              onProvinceChange={setCity}
              onDistrictChange={setDistrict}
              required
            />
            <Text style={styles.helper}>Varsayılan şifre: 1234</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marka Renkleri</Text>
            <View style={styles.previewRow}>
              <View style={[styles.previewChip, { backgroundColor: normalizedPrimary }]}>
                <Text style={[styles.previewChipText, { color: getContrastTextColor(normalizedPrimary) }]}>Tenant</Text>
              </View>
              <View style={[styles.previewChip, { backgroundColor: normalizeHexColor(secondaryColor) || theme.colors.dark }]}>
                <Text style={[styles.previewChipText, { color: theme.colors.textInverse }]}>Landlord</Text>
              </View>
            </View>
            <BrandColorPicker label="Ana Renk" value={primaryColor} onChange={setPrimaryColor} />
            <View style={styles.spacer} />
            <BrandColorPicker label="İkincil Renk" value={secondaryColor} onChange={setSecondaryColor} />
          </View>

          <TouchableOpacity style={[styles.submitButton, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={styles.submitText}>Bağımsız Emlakçıyı Kaydet</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    saveButtonSmall: {
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.primaryLight,
    },
    title: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    scroll: { padding: theme.spacing.md, paddingBottom: 100, gap: theme.spacing.md },
    heroCard: {
      backgroundColor: theme.colors.dark,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      gap: theme.spacing.md,
      alignItems: 'center',
    },
    avatarButton: { position: 'relative' },
    avatar: { width: 88, height: 88, borderRadius: 28 },
    avatarPlaceholder: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: theme.fontSize.xxxl, fontWeight: theme.fontWeight.bold },
    cameraBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.dark,
    },
    heroCopy: { flex: 1 },
    heroTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    heroText: { marginTop: theme.spacing.xs, fontSize: theme.fontSize.sm, lineHeight: 20, color: 'rgba(255,252,248,0.78)' },
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
    field: { marginBottom: theme.spacing.md },
    label: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
    },
    helper: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
    previewRow: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
    previewChip: { flex: 1, minHeight: 68, borderRadius: theme.borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
    previewChipText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
    spacer: { height: theme.spacing.lg },
    submitButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
    },
    submitText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    disabled: { opacity: 0.6 },
  })
);
