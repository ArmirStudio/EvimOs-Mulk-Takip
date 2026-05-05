import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, StatusBar, TextInput, ActivityIndicator, Image, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { tr } from '../../app/translations';
import { useUserData } from '../../hooks/useUserData';
import { supabase } from '../../services/supabase';
import { uploadFileToSupabaseStorage } from '../../services/supabaseStorage';
import AnimatedScreen from './AnimatedScreen';
import KeyboardAwareScrollView, { scrollToInput } from './KeyboardAwareScrollView';
import LocationPicker from './LocationPicker';

const getInitials = (name: string): string =>
  name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Emlakçı', landlord: 'Ev Sahibi', tenant: 'Kiracı', employee: 'Çalışan',
};

const getRoleColors = (theme: ReturnType<typeof useAppTheme>) => ({
  agent:    { bg: theme.colors.primaryLight, text: theme.colors.primary,     border: theme.colors.primary },
  landlord: { bg: theme.colors.warningLight, text: theme.colors.warningText, border: theme.colors.warning },
  tenant:   { bg: theme.colors.infoLight,    text: theme.colors.infoText,    border: theme.colors.info },
  employee: { bg: theme.colors.successLight, text: theme.colors.successText, border: theme.colors.success },
});

interface ProfileData {
  full_name: string;
  phone: string | null;
  city: string | null;
  district: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  created_at: string | null;
}

export default function ProfileEditScreen() {
  const theme = useAppTheme();
  const s = useStyles();
  const scrollRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const { userData, reload } = useUserData();
  const role: 'agent' | 'landlord' | 'tenant' | 'employee' =
    userData?.role === 'agent' || userData?.role === 'landlord' || userData?.role === 'tenant' || userData?.role === 'employee'
      ? userData.role
      : 'tenant';

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [stats, setStats] = useState({ properties: 0, tenants: 0 });

  const loadProfileData = useCallback(async () => {
    if (!userData?.id) return;
    try {
      const { data } = await supabase.from('users').select('*').eq('id', userData.id).single();
      if (data) {
        setProfile(data);
        setEditName(data.full_name ?? '');
        setEditPhone(data.phone ?? '');
        setEditCity(data.city ?? '');
        setEditDistrict(data.district ?? '');
        setAvatarUri(data.avatar_url);
        if (role === 'agent') {
          const [{ count: propCount }, { count: tenantCount }] = await Promise.all([
            supabase.from('properties').select('*', { count: 'exact', head: true }).eq('agent_id', userData.id),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'tenant').eq('created_by', userData.id),
          ]);
          setStats({ properties: propCount || 0, tenants: tenantCount || 0 });
        }
      }
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  }, [userData?.id, role]);

  useEffect(() => { loadProfileData(); }, [loadProfileData]);

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişimi gereklidir.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) handleUploadPhoto(result.assets[0].uri);
    } catch {
      Alert.alert('Hata', 'Fotoğraf seçerken hata oluştu.');
    }
  };

  const handleUploadPhoto = async (uri: string) => {
    if (!userData?.id) return;
    setUploadingPhoto(true);
    try {
      const path = `${userData.id}/avatar_${Date.now()}.jpg`;
      const { publicUrl } = await uploadFileToSupabaseStorage({ bucket: 'avatars', path, fileUri: uri, contentType: 'image/jpeg' });
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userData.id);
      setProfile(p => p ? { ...p, avatar_url: publicUrl } : null);
      setAvatarUri(publicUrl);
      await reload();
      Alert.alert('Başarılı', tr.settings.photoUpdated);
      setShowPhotoSheet(false);
    } catch { Alert.alert('Hata', 'Fotoğraf yüklenirken hata oluştu.'); }
    finally { setUploadingPhoto(false); }
  };

  const handleRemovePhoto = async () => {
    if (!userData?.id) return;
    try {
      await supabase.from('users').update({ avatar_url: null }).eq('id', userData.id);
      setProfile(p => p ? { ...p, avatar_url: null } : null);
      setAvatarUri(null);
      await reload();
      Alert.alert('Başarılı', 'Profil fotoğrafı kaldırıldı.');
      setShowPhotoSheet(false);
    } catch { Alert.alert('Hata', 'Fotoğraf silinirken hata oluştu.'); }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert('Gerekli Alan', 'Ad Soyad boş bırakılamaz.'); return; }
    if (!editCity.trim()) { Alert.alert('Gerekli Alan', tr.location.provinceRequired); return; }
    if (!editDistrict.trim()) { Alert.alert('Gerekli Alan', tr.location.districtRequired); return; }
    setSaving(true);
    try {
      await supabase.from('users').update({
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
        city: editCity.trim(),
        district: editDistrict.trim(),
      }).eq('id', userData?.id);
      await reload();
      Alert.alert('Başarılı', tr.settings.profileUpdated);
      router.back();
    } catch { Alert.alert('Hata', 'Profil güncellenirken hata oluştu.'); }
    finally { setSaving(false); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    const dt = new Date(d);
    const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const roleColors = getRoleColors(theme);
  const rc = roleColors[role] ?? roleColors.tenant;

  if (loading) return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.dark} />
      <View style={s.centerLoader}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
    </SafeAreaView>
  );

  if (!profile) return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.dark} />
      <Text style={s.errorText}>Profil yüklenemedi</Text>
    </SafeAreaView>
  );

  return (
    <AnimatedScreen type="fade">
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.dark} />
        <KeyboardAwareScrollView
          scrollRef={scrollRef}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

            {/* ── TOP NAVIGATION ── */}
            <View style={s.topBar}>
              <TouchableOpacity style={s.topBtn} onPress={() => router.back()}>
                <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.topTitle}>{tr.settings.editProfile}</Text>
              <TouchableOpacity
                style={[s.topBtn, s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={theme.colors.primary} />
                  : <MaterialIcons name="check" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            </View>

            {/* ── AVATAR AREA (Now in Body) ── */}
            <View style={s.avatarArea}>
              <TouchableOpacity onPress={() => setShowPhotoSheet(true)} disabled={uploadingPhoto} activeOpacity={0.8}>
                <View style={s.avatarRing}>
                  {avatarUri
                    ? <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                    : <View style={s.avatarFallback}>
                        <Text style={s.avatarInitials}>{getInitials(editName)}</Text>
                      </View>
                  }
                  {uploadingPhoto && (
                    <View style={s.avatarOverlay}>
                      <ActivityIndicator size="small" color={theme.colors.textInverse} />
                    </View>
                  )}
                </View>
                <View style={s.cameraBadge}>
                  <MaterialIcons name="camera-alt" size={14} color={theme.colors.textInverse} />
                </View>
              </TouchableOpacity>
              <Text style={s.avatarName}>{editName || '—'}</Text>
              <View style={[s.rolePill, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                <Text style={[s.rolePillText, { color: rc.text }]}>{ROLE_LABELS[role]}</Text>
              </View>
            </View>

            {/* Stats (sadece agent) */}
            {role === 'agent' && (
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <View style={s.statIconBox}>
                    <MaterialIcons name="home-work" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={s.statNum}>{stats.properties}</Text>
                    <Text style={s.statLbl}>Mülk</Text>
                  </View>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <View style={s.statIconBox}>
                    <MaterialIcons name="people" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={s.statNum}>{stats.tenants}</Text>
                    <Text style={s.statLbl}>Kiracı</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── FORM ── */}
            <View style={s.body}>

              {/* Düzenlenebilir Bilgiler */}
              <View style={s.sectionHeader}>
                <View style={s.sectionAccent} />
                <Text style={s.sectionTitle}>BİLGİLERİM</Text>
              </View>

              {/* Ad Soyad */}
              <View style={s.fieldCard}>
                <View style={s.fieldTop}>
                  <MaterialIcons name="person-outline" size={15} color={theme.colors.primary} />
                  <Text style={s.fieldLabel}>{tr.settings.nameLabel.toUpperCase()}</Text>
                  <Text style={s.required}> *</Text>
                </View>
                <View style={s.fieldDivider} />
                <TextInput
                  ref={nameInputRef}
                  style={s.fieldInput}
                  placeholder={tr.settings.nameLabel}
                  placeholderTextColor={theme.colors.textMuted}
                  value={editName}
                  onChangeText={setEditName}
                  editable={!saving}
                  returnKeyType="next"
                  onFocus={() => scrollToInput(scrollRef, nameInputRef, 120)}
                  onSubmitEditing={() => phoneInputRef.current?.focus()}
                />
              </View>

              {/* Telefon */}
              <View style={s.fieldCard}>
                <View style={s.fieldTop}>
                  <MaterialIcons name="phone" size={15} color={theme.colors.primary} />
                  <Text style={s.fieldLabel}>{tr.settings.phoneLabel.toUpperCase()}</Text>
                </View>
                <View style={s.fieldDivider} />
                <TextInput
                  ref={phoneInputRef}
                  style={s.fieldInput}
                  placeholder={tr.settings.phoneLabel}
                  placeholderTextColor={theme.colors.textMuted}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  editable={!saving}
                  returnKeyType="done"
                  onFocus={() => scrollToInput(scrollRef, phoneInputRef, 120)}
                  onSubmitEditing={handleSaveProfile}
                />
              </View>

              <LocationPicker
                province={editCity}
                district={editDistrict}
                onProvinceChange={setEditCity}
                onDistrictChange={setEditDistrict}
                required
              />

              {/* Hesap Bilgileri (readonly) */}
              <View style={[s.sectionHeader, { marginTop: 8 }]}>
                <View style={s.sectionAccent} />
                <Text style={s.sectionTitle}>HESAP BİLGİLERİ</Text>
              </View>

              <View style={s.infoCard}>
                {/* E-posta */}
                <View style={s.infoRow}>
                  <View style={s.infoIconBox}>
                    <MaterialIcons name="mail-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={s.infoContent}>
                    <Text style={s.infoRowLabel}>{tr.auth.email}</Text>
                    <Text style={s.infoRowValue} numberOfLines={1}>{profile.email}</Text>
                  </View>
                </View>

                <View style={s.infoDivider} />

                {/* Rol */}
                <View style={s.infoRow}>
                  <View style={s.infoIconBox}>
                    <MaterialIcons name="badge" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={s.infoContent}>
                    <Text style={s.infoRowLabel}>{tr.settings.roleLabel}</Text>
                    <View style={[s.rolePillSmall, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                      <Text style={[s.rolePillSmallText, { color: rc.text }]}>{ROLE_LABELS[role]}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.infoDivider} />

                {/* Üyelik Tarihi */}
                <View style={s.infoRow}>
                  <View style={s.infoIconBox}>
                    <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={s.infoContent}>
                    <Text style={s.infoRowLabel}>{tr.settings.memberSince}</Text>
                    <Text style={s.infoRowValue}>{formatDate(profile.created_at)}</Text>
                  </View>
                </View>
              </View>

              {/* Kaydet */}
              <TouchableOpacity
                style={[s.saveBtnFull, saving && { opacity: 0.55 }]}
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving
                  ? <ActivityIndicator size="small" color={theme.colors.textInverse} />
                  : <>
                      <MaterialIcons name="check-circle" size={20} color={theme.colors.textInverse} style={{ marginRight: 8 }} />
                      <Text style={s.saveBtnFullText}>Kaydet</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>

      {/* ── FOTOĞRAF MODAL ── */}
      <Modal visible={showPhotoSheet} transparent animationType="slide" onRequestClose={() => setShowPhotoSheet(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowPhotoSheet(false)} />
        <View style={s.photoSheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>{tr.settings.profilePhoto}</Text>

          <TouchableOpacity style={s.sheetOption} onPress={handlePickPhoto} disabled={uploadingPhoto}>
            <View style={[s.sheetOptionIcon, { backgroundColor: theme.colors.primaryLight }]}>
              <MaterialIcons name="photo-library" size={20} color={theme.colors.primary} />
            </View>
            <Text style={s.sheetOptionText}>{tr.settings.changePhoto}</Text>
            <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {avatarUri && (
            <TouchableOpacity style={s.sheetOption} onPress={handleRemovePhoto}>
              <View style={[s.sheetOptionIcon, { backgroundColor: theme.colors.errorLight }]}>
                <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
              </View>
              <Text style={[s.sheetOptionText, { color: theme.colors.error }]}>{tr.settings.removePhoto}</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[s.sheetOption, { borderBottomWidth: 0 }]} onPress={() => setShowPhotoSheet(false)}>
            <View style={[s.sheetOptionIcon, { backgroundColor: theme.colors.surface2 }]}>
              <MaterialIcons name="close" size={20} color={theme.colors.textSecondary} />
            </View>
            <Text style={[s.sheetOptionText, { color: theme.colors.textSecondary }]}>İptal</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </AnimatedScreen>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: theme.colors.error, textAlign: 'center', marginTop: 40, fontSize: 14 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: theme.colors.background,
  },
  topBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center', alignItems: 'center',
    ...theme.shadows.sm,
  },
  saveBtn: { backgroundColor: theme.colors.surface },
  topTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '700',
    color: theme.colors.textPrimary,
  },

  // Avatar Area (Flat)
  avatarArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 3, borderColor: theme.colors.primary,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    flex: 1, backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 36, fontWeight: '700', color: theme.colors.primary },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.primary,
    borderWidth: 2, borderColor: theme.colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarName: {
    marginTop: 12, fontSize: 20, fontWeight: '700',
    color: theme.colors.textPrimary, letterSpacing: 0.3,
  },
  rolePill: {
    marginTop: 6,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5,
  },
  rolePillText: { fontSize: 12, fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  statIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  statNum: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  statLbl: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },

  // Body
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, marginTop: 4,
  },
  sectionAccent: {
    width: 3, height: 14, borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
  },

  // Editable Field Card
  fieldCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: 12,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  fieldTop: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
  },
  fieldLabel: {
    marginLeft: 6, fontSize: 11, fontWeight: '600',
    color: theme.colors.textSecondary, letterSpacing: 0.5,
  },
  required: { fontSize: 12, color: theme.colors.error },
  fieldDivider: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: 14 },
  fieldInput: {
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontWeight: '500',
    color: theme.colors.textPrimary,
  },

  // Info Card (readonly)
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: 12,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
  },
  infoIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoRowLabel: {
    fontSize: 11, fontWeight: '600',
    color: theme.colors.textMuted, letterSpacing: 0.4,
    marginBottom: 3,
  },
  infoRowValue: {
    fontSize: 14, fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  infoDivider: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: 14 },
  rolePillSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
  },
  rolePillSmallText: { fontSize: 12, fontWeight: '600' },

  // Save Button
  saveBtnFull: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14, height: 52,
    flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 20,
    ...theme.shadows.md,
  },
  saveBtnFullText: {
    color: theme.colors.textInverse,
    fontSize: 15, fontWeight: '700', letterSpacing: 0.3,
  },

  // Modal
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(44,24,16,0.55)',
  },
  photoSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.divider,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 15, fontWeight: '700',
    color: theme.colors.textPrimary, marginBottom: 12,
  },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  sheetOptionIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  sheetOptionText: {
    flex: 1, fontSize: 14, fontWeight: '500',
    color: theme.colors.textPrimary,
  },
}));
