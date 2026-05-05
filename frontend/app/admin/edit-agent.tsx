import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../theme';
import { tr } from '../translations';
import BrandColorPicker from '../../components/Admin/BrandColorPicker';
import { getAdminAgent, updateAdminAgent, uploadAdminPublicFile } from '../../services/appApi';
import {
  resolveSupabaseStorageUrl,
} from '../../services/supabaseStorage';
import { getContrastTextColor, normalizeHexColor } from '../../utils/branding';
import LocationPicker from '../../components/Shared/LocationPicker';

interface AgencyOption {
  id: string;
  name: string;
  location: string;
  brand_color_primary: string | null;
  entity_type: 'office' | 'company' | null;
}

type AgentRole = 'agent' | 'employee';

export default function EditAgentScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [currentRole, setCurrentRole] = useState<AgentRole>('agent');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [brandColorPrimary, setBrandColorPrimary] = useState('#D4622B');
  const [brandColorSecondary, setBrandColorSecondary] = useState('#2C1810');

  const loadAgent = useCallback(async () => {
    if (!id) {
      Alert.alert(tr.common.error, tr.admin.agentNotFound);
      router.back();
      return;
    }

    try {
      setLoading(true);
      const response = await getAdminAgent(String(id));
      const agentData = response.user;
      const agencyData = response.agencies;

      if (!agentData || (agentData.role !== 'agent' && agentData.role !== 'employee')) {
        Alert.alert(tr.common.error, tr.admin.agentNotFound);
        router.back();
        return;
      }

      setEditName(agentData.full_name || '');
      setEditPhone(agentData.phone || '');
      setEditCity(agentData.city || '');
      setEditDistrict(agentData.district || '');
      setAvatarUri(resolveSupabaseStorageUrl('avatars', agentData.avatar_url));
      setEmail(agentData.email);
      setCreatedAt(agentData.created_at);
      setCurrentRole(agentData.role);
      setSelectedAgencyId(agentData.agency_id || null);
      setBrandColorPrimary(agentData.brand_color_primary || '#D4622B');
      setBrandColorSecondary(agentData.brand_color_secondary || '#2C1810');
      setAgencies((agencyData as AgencyOption[]) || []);
    } catch (error) {
      console.error('Agent load exception:', error);
      Alert.alert(tr.common.error, 'Emlakçı yüklenirken hata oluştu');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  const normalizedPrimary = normalizeHexColor(brandColorPrimary) || theme.colors.primary;
  const normalizedSecondary = normalizeHexColor(brandColorSecondary) || theme.colors.dark;

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true);
      try {
        const upload = await uploadAdminPublicFile({
          bucket: 'avatars',
          path: `${id}/avatar_${Date.now()}.jpg`,
          fileUri: result.assets[0].uri,
          contentType: 'image/jpeg',
          upsert: true,
          folder: String(id),
        });

        await updateAdminAgent(String(id), { avatar_url: upload.public_url });

        setAvatarUri(upload.public_url);
      } catch (error: any) {
        console.error('Avatar update error:', error);
        Alert.alert(tr.common.error, error?.message || 'Fotoğraf yüklenemedi');
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert(tr.common.error, 'Ad Soyad bos birakilamaz');
      return;
    }

    if (!editCity.trim()) {
      Alert.alert(tr.common.error, tr.location.provinceRequired);
      return;
    }

    if (!editDistrict.trim()) {
      Alert.alert(tr.common.error, tr.location.districtRequired);
      return;
    }

    setSaving(true);
    try {
      await updateAdminAgent(String(id), {
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
        city: editCity.trim(),
        district: editDistrict.trim(),
        agency_id: selectedAgencyId,
        brand_color_primary: selectedAgencyId ? null : normalizedPrimary,
        brand_color_secondary: selectedAgencyId ? null : normalizedSecondary,
      });

      Alert.alert(tr.common.success, tr.admin.agentSaved, [
        { text: tr.common.ok, onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Agent save exception:', error);
      Alert.alert(tr.common.error, error?.message || 'Kayıt kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const initials = useMemo(
    () =>
      editName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [editName]
  );

  const selectedAgency = agencies.find((agency) => agency.id === selectedAgencyId) || null;
  const roleLabel = currentRole === 'employee' ? tr.admin.roleEmployee : tr.admin.roleAgent;
  const structureLabel = selectedAgency ? selectedAgency.name : 'Bağımsız Emlakçı Ofisi';
  const structureMeta = selectedAgency
    ? `${selectedAgency.entity_type === 'company' ? 'Şirket' : 'Ofis'} • ${selectedAgency.location || 'Konum belirtilmedi'}`
    : 'Ofis • Şirket bağlantısı olmadan çalışır';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
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
          <TouchableOpacity style={styles.topIconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{tr.admin.editAgent}</Text>
          <TouchableOpacity
            style={[styles.topIconButton, styles.topSaveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size={18} color={theme.colors.primary} /> : <Ionicons name="checkmark" size={22} color={theme.colors.primary} />}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <TouchableOpacity style={styles.avatarButton} onPress={handlePickPhoto} disabled={uploadingPhoto} activeOpacity={0.85}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: normalizedPrimary }]}>
                  <Text style={[styles.avatarInitials, { color: getContrastTextColor(normalizedPrimary) }]}>
                    {initials || '?'}
                  </Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                {uploadingPhoto ? <ActivityIndicator color={theme.colors.textInverse} /> : <Ionicons name="camera" size={14} color={theme.colors.textInverse} />}
              </View>
            </TouchableOpacity>

            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>{editName || email}</Text>
              <Text style={styles.heroSubtitle}>{email}</Text>
              <View style={styles.heroPillRow}>
                <View style={styles.heroPill}>
                  <Ionicons name="briefcase-outline" size={14} color={theme.colors.primary} />
                  <Text style={styles.heroPillText}>{roleLabel}</Text>
                </View>
                <View style={[styles.heroPill, styles.heroPillDark]}>
                  <Text style={[styles.heroPillText, styles.heroPillTextLight]} numberOfLines={1}>
                    {structureLabel}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
            <Field label={tr.admin.agentName} value={editName} onChangeText={setEditName} />
            <Field label={tr.admin.agentPhone} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
            <LocationPicker
              province={editCity}
              district={editDistrict}
              onProvinceChange={setEditCity}
              onDistrictChange={setEditDistrict}
              required
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Bagli Yapi</Text>
            <Text style={styles.sectionHint}>
              Rol degisimi bu ekrandan kaldirildi. Buradan yalnizca calistigi yapi secilir.
            </Text>

            <TouchableOpacity
              style={[styles.agencyCard, !selectedAgencyId && styles.agencyCardActive]}
              onPress={() => setSelectedAgencyId(null)}
              activeOpacity={0.85}
            >
              <View style={[styles.agencySwatch, { backgroundColor: theme.colors.surface2 }]}>
                <Ionicons name="home-outline" size={20} color={theme.colors.textSecondary} />
              </View>
              <View style={styles.agencyInfo}>
                <Text style={styles.agencyName}>Bağımsız Emlakçı Ofisi</Text>
                <Text style={styles.agencyMeta}>Ofis • Şirket bağlantısı olmadan çalışır</Text>
              </View>
              {!selectedAgencyId ? <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} /> : null}
            </TouchableOpacity>

            {agencies.map((agency) => {
              const active = selectedAgencyId === agency.id;
              const typeLabel = agency.entity_type === 'company' ? 'Şirket' : 'Ofis';
              return (
                <TouchableOpacity
                  key={agency.id}
                  style={[styles.agencyCard, active && styles.agencyCardActive]}
                  onPress={() => setSelectedAgencyId(agency.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.agencySwatch, { backgroundColor: agency.brand_color_primary || theme.colors.primary }]}>
                    <Text style={styles.agencyInitial}>{agency.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.agencyInfo}>
                    <Text style={styles.agencyName}>{agency.name}</Text>
                    <Text style={styles.agencyMeta}>{typeLabel} • {agency.location || 'Konum belirtilmedi'}</Text>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Marka Renkleri</Text>
            {selectedAgency ? (
              <>
                <Text style={styles.sectionHint}>
                  Bu emlakçı şu an bir yapıya bağlı. Tema renkleri seçilen {selectedAgency.entity_type === 'company' ? 'şirketten' : 'ofisten'} kalıtılır.
                </Text>
                <View style={styles.previewRow}>
                  <View style={[styles.previewChip, { backgroundColor: selectedAgency.brand_color_primary || theme.colors.primary }]}>
                    <Text style={styles.previewChipText}>Inherited</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sectionHint}>
                  Bağımsız emlakçı olarak çalışıyorsa tenant ve ev sahibi ekranlarına bu renkler yansır.
                </Text>
                <View style={styles.previewRow}>
                  <View style={[styles.previewChip, { backgroundColor: normalizedPrimary }]}>
                    <Text style={[styles.previewChipText, { color: getContrastTextColor(normalizedPrimary) }]}>Tenant</Text>
                  </View>
                  <View style={[styles.previewChip, { backgroundColor: normalizedSecondary }]}>
                    <Text style={[styles.previewChipText, { color: getContrastTextColor(normalizedSecondary) }]}>Landlord</Text>
                  </View>
                </View>
                <BrandColorPicker label="Ana Renk" value={brandColorPrimary} onChange={setBrandColorPrimary} />
                <View style={styles.spacer} />
                <BrandColorPicker label="İkincil Renk" value={brandColorSecondary} onChange={setBrandColorSecondary} />
              </>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
            <InfoRow label={tr.auth.email} value={email} />
            <InfoDivider />
            <InfoRow label={tr.settings.roleLabel} value={roleLabel} />
            <InfoDivider />
            <InfoRow label="Bagli yapi" value={structureLabel} />
            <InfoDivider />
            <InfoRow label="Tur" value={structureMeta} />
            <InfoDivider />
            <InfoRow label="Uyelik Tarihi" value={createdAt ? new Date(createdAt).toLocaleDateString('tr-TR') : '-'} />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator size="small" color={theme.colors.textInverse} /> : <Text style={styles.saveButtonText}>{tr.common.save}</Text>}
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
  keyboardType?: 'default' | 'phone-pad';
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
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InfoDivider() {
  const styles = useStyles();
  return <View style={styles.infoDivider} />;
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    flex: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    topIconButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    topSaveButton: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primaryLight },
    topTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    scroll: { padding: theme.spacing.md, paddingBottom: 100, gap: theme.spacing.md },
    heroCard: { backgroundColor: theme.colors.dark, borderRadius: theme.borderRadius.xl, padding: theme.spacing.lg, flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' },
    avatarButton: { position: 'relative' },
    avatar: { width: 92, height: 92, borderRadius: 30 },
    avatarPlaceholder: { width: 92, height: 92, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    avatarInitials: { fontSize: 34, fontWeight: theme.fontWeight.bold },
    cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, borderWidth: 2, borderColor: theme.colors.dark },
    heroInfo: { flex: 1 },
    heroTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    heroSubtitle: { marginTop: 4, fontSize: theme.fontSize.sm, color: 'rgba(255,252,248,0.76)' },
    heroPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.md },
    heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, paddingHorizontal: theme.spacing.sm, paddingVertical: 6, borderRadius: theme.borderRadius.round },
    heroPillDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
    heroPillText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold, color: theme.colors.primary },
    heroPillTextLight: { color: theme.colors.textInverse },
    sectionCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
    sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
    sectionHint: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md, lineHeight: 20 },
    field: { marginBottom: theme.spacing.md },
    label: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
    input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontSize: theme.fontSize.md, color: theme.colors.textPrimary },
    agencyCard: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.sm, backgroundColor: theme.colors.background },
    agencyCardActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
    agencySwatch: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
    agencyInitial: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    agencyInfo: { flex: 1 },
    agencyName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
    agencyMeta: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
    previewRow: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.md },
    previewChip: { flex: 1, minHeight: 72, borderRadius: theme.borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
    previewChipText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
    spacer: { height: theme.spacing.lg },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md, gap: theme.spacing.md },
    infoLabel: { flex: 1, fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
    infoValue: { flex: 1, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary, textAlign: 'right' },
    infoDivider: { height: 1, backgroundColor: theme.colors.border },
    saveButton: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.md },
    saveButtonText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
    buttonDisabled: { opacity: 0.6 },
  })
);
