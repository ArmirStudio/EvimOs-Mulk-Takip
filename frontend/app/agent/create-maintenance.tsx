import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToSupabaseStorage } from '../../services/supabaseStorage';
import { createMaintenance, listProperties } from '../../services/appApi';
import { createThemedStyles, useAppTheme } from '../theme';
import { useUserData } from '../../hooks/useUserData';

type IssueType = 'electrical' | 'plumbing' | 'structural' | 'appliance' | 'other';

const ISSUE_TYPES: { key: IssueType; label: string; icon: string; color: string }[] = [
  { key: 'electrical', label: 'Elektrik',    icon: 'bolt',              color: '#E67E22' },
  { key: 'plumbing',   label: 'Su/Tesisat',  icon: 'water-drop',        color: '#2980B9' },
  { key: 'structural', label: 'Yapısal',     icon: 'home-repair-service', color: '#8E44AD' },
  { key: 'appliance',  label: 'Beyaz Eşya',  icon: 'kitchen',           color: '#27AE60' },
  { key: 'other',      label: 'Diğer',       icon: 'build',             color: '#7F8C8D' },
];



export default function AgentMaintenanceRequestScreen() {
  const theme = useAppTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { userData } = useUserData();
  const [loading, setLoading] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);

  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [issueType, setIssueType] = useState<IssueType>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<{ uri: string; type: string }[]>([]);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const data = await listProperties();
      const nextProperties = data.properties || [];
      setProperties(nextProperties);
      if (nextProperties.length > 0) {
        setSelectedPropertyId((current) =>
          nextProperties.some((property) => property.id === current) ? current : nextProperties[0].id
        );
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Mülkler yüklenemedi.');
    } finally {
      setLoadingProperties(false);
    }
  };

  const addPhoto = async (fromCamera: boolean) => {
    if (photos.length >= 5) {
      Alert.alert('Limit', 'En fazla 5 fotoğraf ekleyebilirsiniz.');
      return;
    }
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('İzin Gerekli', fromCamera ? 'Kamera izni verilmedi.' : 'Galeri izni verilmedi.');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhotos(prev => [...prev, { uri: asset.uri, type: asset.mimeType || 'image/jpeg' }]);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert('Fotoğraf Ekle', 'Kaynak seçin', [
      { text: 'Kamera', onPress: () => addPhoto(true) },
      { text: 'Galeri', onPress: () => addPhoto(false) },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!selectedPropertyId) {
      Alert.alert('Uyarı', 'Lütfen bir mülk seçin.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      Alert.alert('Uyarı', 'Başlık ve açıklama alanları zorunludur.');
      return;
    }

    setLoading(true);
    try {
      const actorId = userData?.id || 'maintenance-user';

      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const ext = p.type === 'image/png' ? 'png' : 'jpg';
        const path = `${selectedPropertyId}/${actorId}/${Date.now()}-${i}.${ext}`;
        try {
          const upload = await uploadFileToSupabaseStorage({
            bucket: 'maintenance-photos',
            path,
            fileUri: p.uri,
            contentType: p.type,
          });
          uploadedUrls.push(upload.path);
        } catch {
          // Fotoğraf yükleme hatası sessiz
        }
      }

      await createMaintenance({
        property_id: selectedPropertyId,
        title: title.trim(),
        description: description.trim(),
        photo_urls: uploadedUrls,
        priority: issueType === 'structural' ? 'high' : issueType === 'other' ? 'medium' : 'low',
      });

      Alert.alert('Başarılı', 'Arıza talebi oluşturuldu.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Talep oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProperties) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={s.loadingText}>Mülkler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.dark} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Yeni Arıza Talebi</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >

          {/* ── Mülk Seçimi ─────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="location-on" size={18} color={theme.colors.primary} />
              <Text style={s.sectionTitle}>Mülk Seçin</Text>
            </View>

            {properties.length === 0 ? (
              <View style={s.emptyCard}>
                <MaterialIcons name="home" size={36} color={theme.colors.textMuted} />
                <Text style={s.emptyTitle}>Mülk Bulunamadı</Text>
                <Text style={s.emptySubtitle}>Önce mülk oluşturmanız gerekmektedir.</Text>
              </View>
            ) : (
              <>
                {properties.map((item) => {
                  const selected = selectedPropertyId === item.id;
                  const isOccupied = item.status === 'occupied';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[s.propertyCard, selected && s.propertyCardSelected]}
                      onPress={() => setSelectedPropertyId(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.propIconBox, selected && s.propIconBoxSelected]}>
                        <MaterialIcons name="apartment" size={22} color={selected ? theme.colors.textInverse : theme.colors.textMuted} />
                      </View>
                      <View style={s.propInfo}>
                        <Text style={[s.propAddress, selected && s.propAddressSelected]} numberOfLines={1}>
                          {item.address}
                        </Text>
                        <Text style={s.propCity}>{item.city} / {item.district}</Text>
                      </View>
                      <View style={[s.statusDot, { backgroundColor: isOccupied ? theme.colors.success : theme.colors.textMuted }]} />
                      {selected && <MaterialIcons name="check-circle" size={20} color={theme.colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>

          {/* ── Sorun Türü ──────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="build" size={18} color={theme.colors.primary} />
              <Text style={s.sectionTitle}>Sorun Türü</Text>
            </View>
            <View style={s.issueGrid}>
              {ISSUE_TYPES.map(it => {
                const selected = issueType === it.key;
                return (
                  <TouchableOpacity
                    key={it.key}
                    style={[s.issueChip, selected && { backgroundColor: it.color + '22', borderColor: it.color }]}
                    onPress={() => setIssueType(it.key)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name={it.icon as any} size={22} color={selected ? it.color : theme.colors.textMuted} />
                    <Text style={[s.issueLabel, selected && { color: it.color }]}>{it.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>



          {/* ── Açıklama ────────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
              <Text style={s.sectionTitle}>Açıklama</Text>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Başlık *</Text>
              <TextInput
                style={s.input}
                placeholder="Kısa ve açıklayıcı bir başlık"
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Detaylı Açıklama *</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Sorunun nerede, ne zaman başladığını ve detaylarını yazın..."
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── Fotoğraflar ─────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="photo-camera" size={18} color={theme.colors.primary} />
              <Text style={s.sectionTitle}>Fotoğraflar <Text style={s.optionalTag}>(opsiyonel, max 5)</Text></Text>
            </View>

            <View style={s.photoGrid}>
              {photos.map((photo, i) => (
                <View key={i} style={s.photoThumb}>
                  <Image source={{ uri: photo.uri }} style={s.photoImg} />
                  <TouchableOpacity style={s.photoRemove} onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>
                    <MaterialIcons name="close" size={14} color={theme.colors.textInverse} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 5 && (
                <TouchableOpacity style={s.photoAdd} onPress={handleAddPhoto} activeOpacity={0.8}>
                  <MaterialIcons name="add-a-photo" size={28} color={theme.colors.primary} />
                  <Text style={s.photoAddText}>Ekle</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Submit ──────────────────────────────────────── */}
          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <>
                <MaterialIcons name="send" size={18} color={theme.colors.textInverse} />
                <Text style={s.submitBtnText}>Talebi Gönder</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, gap: 12 },
  loadingText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: theme.colors.dark,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  optionalTag: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, fontWeight: '400' },

  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyTitle: { fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  emptySubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, textAlign: 'center' },

  // Property Cards
  propertyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface2,
    marginBottom: 8,
  },
  propertyCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  propIconBox: {
    width: 44, height: 44, borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  propIconBoxSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  propInfo: { flex: 1 },
  propAddress: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  propAddressSelected: { color: theme.colors.primary },
  propCity: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  // Issue Grid
  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  issueChip: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    width: '30%', paddingVertical: 14, gap: 6,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1.5, borderColor: theme.colors.border,
  },
  issueLabel: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold, color: theme.colors.textMuted, textAlign: 'center' },

  // Priority
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityChip: {
    flex: 1, paddingVertical: 12, borderRadius: theme.borderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface2,
    borderWidth: 1.5, borderColor: theme.colors.border,
  },
  priorityLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.textMuted },

  // Form Fields
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: theme.fontSize.sm, color: theme.colors.textPrimary,
  },
  textArea: { minHeight: 120, paddingTop: 12 },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { width: 88, height: 88, borderRadius: theme.borderRadius.md, position: 'relative' },
  photoImg: { width: 88, height: 88, borderRadius: theme.borderRadius.md },
  photoRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.colors.error,
    justifyContent: 'center', alignItems: 'center',
  },
  photoAdd: {
    width: 88, height: 88, borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1.5, borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  photoAddText: { fontSize: theme.fontSize.xs, color: theme.colors.primary, fontWeight: theme.fontWeight.semibold },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: 16, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.bold, color: theme.colors.textInverse },
}));
