import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../theme';
import { tr } from '../translations';
import { deleteProperty, updateProperty } from '../../services/appApi';
import { supabase } from '../../services/supabase';
import { uploadFileToSupabaseStorage } from '../../services/supabaseStorage';
import LocationPicker from '../../components/Shared/LocationPicker';
import { getUserData } from '../../hooks/useUserData';
import { getOfficeOwnerId, hasFullEmployeeAccess } from '../../utils/employeeAccess';
import { CurrencyInput } from '../../components/Shared/CurrencyInput';
import DayPickerModal from '../../components/Shared/DayPickerModal';
import { parseCurrencyInput } from '../../utils/propertyHelpers';
import { AMENITY_CONFIG, AmenityKey } from '../../constants/amenities';

// ─── Types & Constants ─────────────────────────────────────────────────────────

type PropertyType = 'apartment' | 'house' | 'villa' | 'commercial';
type PropertyStatus = 'vacant' | 'occupied' | 'maintenance';
type FurnishingType = 'furnished' | 'unfurnished';
type HeatingType = 'kombi' | 'merkezi' | 'yerden' | 'klima' | 'yok';

const PROPERTY_TYPES: { key: PropertyType; label: string; icon: string }[] = [
  { key: 'apartment', label: tr.properties.apartment, icon: 'apartment' },
  { key: 'house', label: tr.properties.house, icon: 'home' },
  { key: 'villa', label: 'Villa', icon: 'villa' },
  { key: 'commercial', label: tr.properties.commercial, icon: 'business' },
];

const PROPERTY_STATUSES: { key: PropertyStatus; label: string; icon: string }[] = [
  { key: 'vacant', label: tr.properties.vacant, icon: 'check-circle' },
  { key: 'occupied', label: tr.properties.occupied, icon: 'people' },
  { key: 'maintenance', label: tr.properties.maintenance, icon: 'build' },
];

const HEATING_OPTS: { key: HeatingType; label: string; icon: string }[] = [
  { key: 'kombi', label: 'Kombi', icon: 'local-fire-department' },
  { key: 'merkezi', label: 'Merkezi', icon: 'home' },
  { key: 'yerden', label: 'Yerden', icon: 'waves' },
  { key: 'klima', label: 'Klima', icon: 'air' },
  { key: 'yok', label: 'Yok', icon: 'block' },
];

const ROOM_TYPES = ['Stüdyo', '1+0', '1+1', '2+1', '3+1', '4+1', '5+1', '5+2', '6+', 'Diğer'];

const AMENITY_INIT: Record<AmenityKey, boolean> = {
  wifi: false, parking: false, pool: false, gym: false, elevator: false,
  balcony: false, security: false, generator: false, garden: false,
  storage: false, jacuzzi: false,
};

// Decode "3+1 | Mülk Adı" pattern back to {roomType, name}
function parseDescription(desc: string): { roomType: string; name: string } {
  const match = desc.match(/^([0-9]+\+[0-9]+|Stüdyo|[0-9]\+[0-9]|Diğer)\s*\|\s*(.+)$/);
  if (match) return { roomType: match[1].trim(), name: match[2].trim() };
  return { roomType: '', name: desc };
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <MaterialIcons name={icon as any} size={18} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function EditPropertyScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [landlords, setLandlords] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Core fields
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [status, setStatus] = useState<PropertyStatus>('vacant');
  const [furnishing, setFurnishing] = useState<FurnishingType>('unfurnished');

  // Size & features
  const [area, setArea] = useState('');
  const [roomType, setRoomType] = useState('');
  const [heating, setHeating] = useState<HeatingType>('kombi');
  const [amenities, setAmenities] = useState<Record<AmenityKey, boolean>>(AMENITY_INIT);
  const toggleAmenity = (key: AmenityKey) =>
    setAmenities(prev => ({ ...prev, [key]: !prev[key] }));

  // Pricing
  const [monthlyRent, setMonthlyRent] = useState('');
  const [rentDay, setRentDay] = useState('');
  const [showRentDayPicker, setShowRentDayPicker] = useState(false);
  const [maintenanceFee, setMaintenanceFee] = useState('');
  const [duesDay, setDuesDay] = useState('');
  const [showDuesDayPicker, setShowDuesDayPicker] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency, setDepositCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');

  // People
  const [selectedLandlord, setSelectedLandlord] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [tenantAssignments, setTenantAssignments] = useState<
    Record<string, { propertyId: string; label: string }>
  >({});
  const [landlordSearch, setLandlordSearch] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Photos
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);

  const officeOwnerId = getOfficeOwnerId(currentUser);

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!id) {
      Alert.alert(tr.common.error, tr.errors.loadFailed);
      router.back();
      return;
    }
    if (!officeOwnerId) return;

    try {
      setLoading(true);

      const [propertyRes, landlordsRes, tenantsRes, employeesRes] = await Promise.all([
        supabase.from('properties').select('*').eq('id', id).single(),
        supabase.from('users').select('id, full_name, email').eq('role', 'landlord').eq('created_by', officeOwnerId).order('full_name', { ascending: true }),
        supabase.from('users').select('id, full_name, email').eq('role', 'tenant').eq('created_by', officeOwnerId).order('full_name', { ascending: true }),
        supabase.from('users').select('id, full_name, email').eq('role', 'employee').eq('created_by', officeOwnerId).order('full_name', { ascending: true }),
      ]);

      if (propertyRes.error || !propertyRes.data) throw propertyRes.error;

      const prop = propertyRes.data;
      setLandlords(landlordsRes.data || []);
      setTenants(tenantsRes.data || []);
      setEmployees(employeesRes.data || []);

      // Tenant conflict map
      const tenantIds = (tenantsRes.data || []).map((t: any) => t.id).filter(Boolean);
      if (tenantIds.length > 0) {
        const { data: assignedProps } = await supabase
          .from('properties')
          .select('id, tenant_id, address, description')
          .in('tenant_id', tenantIds)
          .eq('agent_id', officeOwnerId)
          .not('tenant_id', 'is', null)
          .neq('id', id);

        const assignmentMap: Record<string, { propertyId: string; label: string }> = {};
        (assignedProps || []).forEach((p: any) => {
          if (!p?.tenant_id) return;
          assignmentMap[p.tenant_id] = {
            propertyId: p.id,
            label: p.description || p.address || tr.agent.property,
          };
        });
        setTenantAssignments(assignmentMap);
      }

      // Core fields
      const { roomType: parsedRoom, name: parsedName } = parseDescription(prop.description || '');
      setPropertyName(parsedName);
      setRoomType(parsedRoom);
      setAddress(prop.address || '');
      setCity(prop.city || '');
      setDistrict(prop.district || '');
      setPropertyType((prop.property_type || 'apartment') as PropertyType);
      setStatus((prop.status || 'vacant') as PropertyStatus);
      setFurnishing(prop.is_furnished ? 'furnished' : 'unfurnished');

      // Size & features
      setArea(prop.area ? String(prop.area) : '');
      setHeating((prop.heating || 'kombi') as HeatingType);
      if (prop.amenities && typeof prop.amenities === 'object') {
        setAmenities({ ...AMENITY_INIT, ...prop.amenities });
      }

      // Pricing
      setMonthlyRent(prop.monthly_rent ? String(prop.monthly_rent) : '');
      setRentDay(prop.rent_day ? String(prop.rent_day) : '');
      setMaintenanceFee(prop.dues_amount ? String(prop.dues_amount) : '');
      setDuesDay(prop.dues_day ? String(prop.dues_day) : '');
      setDepositAmount(prop.deposit_amount ? String(prop.deposit_amount) : '');
      setDepositCurrency(prop.deposit_currency || 'TRY');

      // People
      setSelectedLandlord(prop.landlord_id || '');
      setSelectedTenant(prop.tenant_id || '');
      setSelectedEmployee(prop.employee_id || '');

      // Photos
      setExistingImages(prop.images || []);
    } catch {
      Alert.alert(tr.common.error, tr.errors.loadFailed);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, officeOwnerId]);

  useEffect(() => {
    const checkAccess = async () => {
      const user = await getUserData();
      setCurrentUser(user);
      const allowedRoles = ['agent', 'admin', 'manager', 'staff'];
      const canAccess = !!user && (allowedRoles.includes(user.role) || hasFullEmployeeAccess(user));
      if (!canAccess) router.replace('/agent/dashboard' as any);
    };
    checkAccess();
  }, []);

  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser, loadData]);

  const selectedLandlordInfo = useMemo(
    () => landlords.find((item) => item.id === selectedLandlord),
    [landlords, selectedLandlord]
  );

  const selectedTenantInfo = useMemo(
    () => tenants.find((item) => item.id === selectedTenant),
    [tenants, selectedTenant]
  );

  // ─── Photo Handlers ────────────────────────────────────────────────────────

  const pickNewPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 10 - existingImages.length - newPhotos.length,
    });
    if (!result.canceled) {
      setNewPhotos(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const removeExistingImage = (index: number) =>
    setExistingImages(prev => prev.filter((_, i) => i !== index));

  const removeNewPhoto = (index: number) =>
    setNewPhotos(prev => prev.filter((_, i) => i !== index));

  // ─── Tenant Selection ──────────────────────────────────────────────────────

  const onSelectTenant = (tenantId: string) => {
    if (!tenantId) {
      setSelectedTenant('');
      if (status !== 'vacant') setStatus('vacant');
      return;
    }
    if (tenantAssignments[tenantId]) {
      Alert.alert(tr.common.warning, tr.properties.tenantAlreadyAssignedError);
      return;
    }
    setSelectedTenant(tenantId);
    if (status === 'vacant') setStatus('occupied');
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!id) return;
    if (!address.trim()) {
      Alert.alert(tr.common.warning, tr.propertyWizard.address + ' ' + tr.common.required.toLowerCase());
      return;
    }
    if (!city.trim() || !district.trim()) {
      Alert.alert(tr.common.warning, tr.location.bothRequired);
      return;
    }
    if (!selectedLandlord) {
      Alert.alert(tr.common.warning, tr.properties.landlord + ' ' + tr.common.required.toLowerCase());
      return;
    }

    const parsedRent = Number(monthlyRent);
    if (!Number.isFinite(parsedRent) || parsedRent < 0) {
      Alert.alert(tr.common.warning, tr.errors.invalidInput);
      return;
    }

    const parsedRentDay = rentDay ? Number(rentDay) : null;
    if (parsedRentDay !== null && (!Number.isInteger(parsedRentDay) || parsedRentDay < 1 || parsedRentDay > 31)) {
      Alert.alert(tr.common.warning, tr.propertyWizard.paymentDay + ' 1-31');
      return;
    }

    const tenantId = status === 'vacant' ? null : (selectedTenant || null);
    if (status === 'occupied' && !tenantId) {
      Alert.alert(tr.common.warning, tr.properties.occupied + ' - ' + tr.properties.tenant);
      return;
    }
    if (tenantId && tenantAssignments[tenantId]) {
      Alert.alert(tr.common.warning, tr.properties.tenantAlreadyAssignedError);
      return;
    }

    try {
      setSaving(true);

      // Upload new photos
      const uploadedUrls: string[] = [];
      for (let i = 0; i < newPhotos.length; i++) {
        try {
          const uri = newPhotos[i];
          const path = `${id}/${Date.now()}_${i}.jpg`;
          const upload = await uploadFileToSupabaseStorage({
            bucket: 'property-images',
            path,
            fileUri: uri,
            contentType: 'image/jpeg',
            upsert: true,
            client: supabase,
          });
          if (upload.publicUrl) uploadedUrls.push(upload.publicUrl);
        } catch { /* skip failed uploads */ }
      }

      const finalImages = [...existingImages, ...uploadedUrls];

      // Encode room_type into description (DB sütunu eklendiğinde güncellenir)
      const descriptionWithRoom = roomType
        ? `${roomType} | ${propertyName.trim() || tr.agent.property}`
        : (propertyName.trim() || null);

      await updateProperty(id, {
        description: descriptionWithRoom,
        address: address.trim(),
        city: city.trim(),
        district: district.trim(),
        property_type: propertyType,
        status,
        is_furnished: furnishing === 'furnished',
        area: area ? parseInt(area, 10) : null,
        heating: heating || null,
        amenities,
        landlord_id: selectedLandlord,
        tenant_id: tenantId,
        contract_start: tenantId ? undefined : null,
        contract_end: tenantId ? undefined : null,
        contract_duration: tenantId ? undefined : null,
        employee_id: selectedEmployee || null,
        monthly_rent: parsedRent,
        rent_day: parsedRentDay,
        dues_amount: maintenanceFee ? parseFloat(maintenanceFee) : null,
        dues_day: duesDay ? parseInt(duesDay, 10) : null,
        deposit_amount: tenantId && depositAmount ? parseCurrencyInput(depositAmount) : null,
        deposit_currency: tenantId ? depositCurrency : null,
        images: finalImages,
      });

      Alert.alert(tr.common.success, tr.properties.propertyUpdated, [
        {
          text: tr.common.ok,
          onPress: () => router.replace(`/agent/property-detail?id=${id}` as any),
        },
      ]);
    } catch {
      Alert.alert(tr.common.error, tr.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

  const confirmDelete = () => {
    Alert.alert(
      tr.properties.deleteProperty,
      tr.properties.deletePropertyConfirm,
      [
        { text: tr.common.cancel, style: 'cancel' },
        { text: tr.common.yes + ', ' + tr.common.delete, style: 'destructive', onPress: handleDelete },
      ]
    );
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await deleteProperty(id);
      Alert.alert(tr.common.success, tr.properties.deletePropertySuccess, [
        { text: tr.common.ok, onPress: () => router.replace('/agent/properties') },
      ]);
    } catch {
      Alert.alert(tr.common.error, tr.errors.loadFailed);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // ─── Derived display values ────────────────────────────────────────────────

  const allPhotos = [...existingImages, ...newPhotos];
  const canAddMore = allPhotos.length < 10;
  const filteredLandlords = landlords.filter(l => {
    const q = landlordSearch.trim().toLowerCase();
    if (!q) return true;
    return (l.full_name || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q);
  });
  const filteredTenants = tenants.filter(t => {
    const q = tenantSearch.trim().toLowerCase();
    if (!q) return true;
    return (t.full_name || '').toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q);
  });
  const filteredEmployees = employees.filter(e => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return true;
    return (e.full_name || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q);
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>{tr.properties.editProperty}</Text>
          <Text style={styles.headerSub}>{propertyName || tr.agent.property}</Text>
        </View>
        <View style={styles.headerBadge}>
          <MaterialIcons name="edit" size={16} color={theme.colors.primary} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >

          {/* ── Fotoğraflar ────────────────────────────────────────────── */}
          <View style={styles.card}>
            <SectionHeader icon="photo-library" title="Mülk Fotoğrafları" subtitle={`${allPhotos.length}/10 fotoğraf`} />
            <View style={styles.photoGrid}>
              {existingImages.map((uri, i) => (
                <View key={`ex-${i}`} style={styles.photoCell}>
                  <Image source={{ uri }} style={styles.photoCellImg} />
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Kapak</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removeExistingImage(i)}>
                    <MaterialIcons name="close" size={11} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {newPhotos.map((uri, i) => (
                <View key={`new-${i}`} style={styles.photoCell}>
                  <Image source={{ uri }} style={styles.photoCellImg} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removeNewPhoto(i)}>
                    <MaterialIcons name="close" size={11} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {canAddMore && (
                <TouchableOpacity style={styles.photoAddCell} onPress={pickNewPhotos} activeOpacity={0.75}>
                  <MaterialIcons name="add-a-photo" size={22} color={theme.colors.primary} />
                  <Text style={styles.photoAddText}>Ekle</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Mülk Adı & Konum ──────────────────────────────────────── */}
          <View style={styles.card}>
            <SectionHeader icon="location-on" title="Mülk Adı & Konum" subtitle="Adres ve şehir bilgisi" />

            <Text style={styles.fieldLabel}>{tr.propertyWizard.propertyName}</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="apartment" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={propertyName}
                onChangeText={setPropertyName}
                placeholder="Örn: Deniz Manzaralı Daire"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{tr.propertyWizard.address}</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="home" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.inputWithIcon, styles.textarea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Tam adres"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <LocationPicker
                province={city}
                district={district}
                onProvinceChange={setCity}
                onDistrictChange={setDistrict}
                required
                layout="row"
              />
            </View>
          </View>

          {/* ── Mülk Tipi & Durum ─────────────────────────────────────── */}
          <View style={styles.card}>
            <SectionHeader icon="tune" title="Mülk Tipi & Durum" subtitle="Tür, kiralama durumu ve eşya bilgisi" />

            <Text style={styles.fieldLabel}>{tr.properties.propertyType}</Text>
            <View style={styles.chipRow}>
              {PROPERTY_TYPES.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.iconChip, propertyType === item.key && styles.iconChipActive]}
                  onPress={() => setPropertyType(item.key)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={18}
                    color={propertyType === item.key ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.iconChipText, propertyType === item.key && styles.iconChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{tr.properties.status}</Text>
            <View style={styles.chipRow}>
              {PROPERTY_STATUSES.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.iconChip, status === item.key && styles.iconChipActive]}
                  onPress={() => setStatus(item.key)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={18}
                    color={status === item.key ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.iconChipText, status === item.key && styles.iconChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Eşya Durumu</Text>
            <View style={styles.segmentControl}>
              {([{ key: 'furnished', label: 'Eşyalı', icon: 'chair' }, { key: 'unfurnished', label: 'Boş', icon: 'crop-square' }] as const).map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.segmentTab, furnishing === item.key && styles.segmentTabActive]}
                  onPress={() => setFurnishing(item.key)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name={item.icon as any} size={16} color={furnishing === item.key ? theme.colors.primary : theme.colors.textSecondary} />
                  <Text style={[styles.segmentTabText, furnishing === item.key && styles.segmentTabTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Boyut & Oda Tipi ──────────────────────────────────────── */}
          <View style={styles.card}>
            <SectionHeader icon="straighten" title="Boyut & Oda Tipi" subtitle="Metrekare ve oda konfigürasyonu" />

            <Text style={styles.fieldLabel}>Alan (m²)</Text>
            <View style={styles.inputSuffixRow}>
              <TextInput
                style={styles.inputSuffix}
                value={area}
                onChangeText={setArea}
                keyboardType="numeric"
                placeholder="Örn: 95"
                placeholderTextColor={theme.colors.textMuted}
              />
              <View style={styles.suffixBox}>
                <Text style={styles.suffixText}>m²</Text>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Oda Tipi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomTypeScroll} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
              {ROOM_TYPES.map(rt => (
                <TouchableOpacity
                  key={rt}
                  style={[styles.roomChip, roomType === rt && styles.roomChipActive]}
                  onPress={() => setRoomType(prev => prev === rt ? '' : rt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roomChipText, roomType === rt && styles.roomChipTextActive]}>{rt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Isınma ────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <SectionHeader icon="local-fire-department" title="Isınma Sistemi" />
            <View style={styles.chipRow}>
              {HEATING_OPTS.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.iconChip, heating === item.key && styles.iconChipActive]}
                  onPress={() => setHeating(item.key)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={18}
                    color={heating === item.key ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.iconChipText, heating === item.key && styles.iconChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Fiyatlandırma ─────────────────────────────────────────── */}
          <View style={styles.card}>
            <SectionHeader icon="payments" title="Fiyatlandırma" subtitle="Kira, aidat ve depozito" />

            <View style={styles.priceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>{tr.propertyWizard.monthlyRent}</Text>
                <View style={styles.inputSuffixRow}>
                  <CurrencyInput
                    inputStyle={styles.inputSuffix}
                    value={monthlyRent}
                    onValueChange={setMonthlyRent}
                    placeholder="15.000"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <View style={styles.suffixBox}><Text style={styles.suffixText}>₺/ay</Text></View>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Aidat</Text>
                <View style={styles.inputSuffixRow}>
                  <CurrencyInput
                    inputStyle={styles.inputSuffix}
                    value={maintenanceFee}
                    onValueChange={setMaintenanceFee}
                    placeholder="500"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <View style={styles.suffixBox}><Text style={styles.suffixText}>₺/ay</Text></View>
                </View>
              </View>
            </View>

            <View style={[styles.priceRow, { marginTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Kira Günü</Text>
                <TouchableOpacity
                  style={[styles.dayBtn, rentDay ? styles.dayBtnActive : null]}
                  onPress={() => setShowRentDayPicker(true)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="event" size={16} color={rentDay ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.dayBtnText, rentDay ? styles.dayBtnTextActive : null]}>
                    {rentDay ? `Her ayın ${rentDay}.` : 'Gün seç'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Aidat Günü</Text>
                <TouchableOpacity
                  style={[styles.dayBtn, duesDay ? styles.dayBtnActive : null]}
                  onPress={() => setShowDuesDayPicker(true)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="event" size={16} color={duesDay ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.dayBtnText, duesDay ? styles.dayBtnTextActive : null]}>
                    {duesDay ? `Her ayın ${duesDay}.` : 'Gün seç'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{tr.propertyWizard.deposit}</Text>
            <View style={styles.depositRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.inputSuffixRow}>
                  <CurrencyInput
                    inputStyle={styles.inputSuffix}
                    value={depositAmount}
                    onValueChange={setDepositAmount}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <View style={styles.suffixBox}><Text style={styles.suffixText}>Depozito</Text></View>
                </View>
              </View>
              <View style={styles.currencyPills}>
                {(['TRY', 'USD', 'EUR'] as const).map(curr => (
                  <TouchableOpacity
                    key={curr}
                    style={[styles.currPill, depositCurrency === curr && styles.currPillActive]}
                    onPress={() => setDepositCurrency(curr)}
                  >
                    <Text style={[styles.currPillText, depositCurrency === curr && styles.currPillTextActive]}>{curr}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ── Olanaklar ─────────────────────────────────────────────── */}
          <View style={styles.card}>
            <SectionHeader icon="star" title="Olanaklar" subtitle="Mülke ait özellikler" />
            <View style={styles.amenityGrid}>
              {(Object.keys(AMENITY_CONFIG) as AmenityKey[]).map(key => {
                const cfg = AMENITY_CONFIG[key];
                const active = amenities[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.amenityItem, active && styles.amenityItemActive]}
                    onPress={() => toggleAmenity(key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.amenityIconWrap, active && styles.amenityIconWrapActive]}>
                      <MaterialIcons name={cfg.icon as any} size={20} color={active ? theme.colors.primary : theme.colors.textSecondary} />
                    </View>
                    <Text style={[styles.amenityLabel, active && styles.amenityLabelActive]}>{cfg.label}</Text>
                    {active && (
                      <View style={styles.amenityCheck}>
                        <MaterialIcons name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Ev Sahibi ─────────────────────────────────────────────── */}
          <View style={styles.card}>
            <SectionHeader icon="person" title={tr.properties.landlord} subtitle="Zorunlu alan" />

            {selectedLandlordInfo ? (
              <View style={styles.selectedPersonRow}>
                <View style={styles.personAvatar}>
                  <MaterialIcons name="person" size={16} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{selectedLandlordInfo.full_name}</Text>
                  <Text style={styles.personEmail}>{selectedLandlordInfo.email}</Text>
                </View>
                <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyPersonRow}>
                <MaterialIcons name="person-add" size={16} color={theme.colors.textMuted} />
                <Text style={styles.emptyPersonText}>Ev sahibi seçilmedi</Text>
              </View>
            )}

            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={tr.properties.searchLandlordPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={landlordSearch}
                onChangeText={setLandlordSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.selectionBox}>
              {filteredLandlords.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionItem, selectedLandlord === item.id && styles.optionSelected]}
                  onPress={() => setSelectedLandlord(item.id)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, selectedLandlord === item.id && styles.optionTitleSelected]}>{item.full_name}</Text>
                    <Text style={styles.optionSub}>{item.email}</Text>
                  </View>
                  {selectedLandlord === item.id && <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
              {filteredLandlords.length === 0 && (
                <View style={styles.optionItem}><Text style={styles.optionSub}>Sonuç bulunamadı</Text></View>
              )}
            </View>
          </View>

          {/* ── Kiracı ────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <SectionHeader icon="people" title={tr.properties.tenant} subtitle="İsteğe bağlı" />

            {selectedTenantInfo ? (
              <View style={styles.selectedPersonRow}>
                <View style={styles.personAvatar}>
                  <MaterialIcons name="person" size={16} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{selectedTenantInfo.full_name}</Text>
                  <Text style={styles.personEmail}>{selectedTenantInfo.email}</Text>
                </View>
                <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyPersonRow}>
                <MaterialIcons name="person-off" size={16} color={theme.colors.textMuted} />
                <Text style={styles.emptyPersonText}>{tr.properties.noTenants}</Text>
              </View>
            )}

            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={tr.properties.searchTenantPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={tenantSearch}
                onChangeText={setTenantSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.selectionBox}>
              <TouchableOpacity
                style={[styles.optionItem, !selectedTenant && styles.optionSelected]}
                onPress={() => onSelectTenant('')}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, !selectedTenant && styles.optionTitleSelected]}>{tr.properties.noTenants}</Text>
                </View>
                {!selectedTenant && <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />}
              </TouchableOpacity>
              {filteredTenants.map(item => {
                const assignment = tenantAssignments[item.id];
                const isDisabled = !!assignment;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.optionItem,
                      selectedTenant === item.id && styles.optionSelected,
                      isDisabled && styles.optionDisabled,
                    ]}
                    onPress={() => isDisabled ? undefined : onSelectTenant(item.id)}
                    disabled={isDisabled}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, selectedTenant === item.id && styles.optionTitleSelected]}>{item.full_name}</Text>
                      <Text style={styles.optionSub}>{item.email}</Text>
                      {assignment ? (
                        <Text style={styles.optionMeta}>
                          {tr.properties.tenantAlreadyAssignedLabel.replace('{property}', assignment.label)}
                        </Text>
                      ) : null}
                    </View>
                    {selectedTenant === item.id && <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
              {filteredTenants.length === 0 && tenants.length > 0 && (
                <View style={styles.optionItem}><Text style={styles.optionSub}>Sonuç bulunamadı</Text></View>
              )}
            </View>
          </View>

          {/* ── Sorumlu Çalışan ───────────────────────────────────────── */}
          <View style={styles.card}>
            <SectionHeader icon="badge" title="Sorumlu Çalışan" subtitle="İsteğe bağlı" />
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={tr.properties.searchEmployeePlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={employeeSearch}
                onChangeText={setEmployeeSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.selectionBox}>
              <TouchableOpacity
                style={[styles.optionItem, !selectedEmployee && styles.optionSelected]}
                onPress={() => setSelectedEmployee('')}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, !selectedEmployee && styles.optionTitleSelected]}>Çalışan Yok</Text>
                </View>
                {!selectedEmployee && <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />}
              </TouchableOpacity>
              {filteredEmployees.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionItem, selectedEmployee === item.id && styles.optionSelected]}
                  onPress={() => setSelectedEmployee(item.id)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, selectedEmployee === item.id && styles.optionTitleSelected]}>{item.full_name}</Text>
                    <Text style={styles.optionSub}>{item.email}</Text>
                  </View>
                  {selectedEmployee === item.id && <MaterialIcons name="check-circle" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
              {employees.length === 0 && (
                <View style={styles.optionItem}><Text style={styles.optionSub}>Kayıtlı çalışan yok</Text></View>
              )}
            </View>
          </View>

        </ScrollView>

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.deleteBtn, (deleting || saving) && { opacity: 0.6 }]}
            onPress={confirmDelete}
            disabled={deleting || saving}
          >
            {deleting ? (
              <ActivityIndicator color={theme.colors.error} />
            ) : (
              <>
                <MaterialIcons name="delete-outline" size={18} color={theme.colors.error} />
                <Text style={styles.deleteBtnText}>{tr.properties.deleteProperty}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, (saving || deleting) && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving || deleting}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <>
                <MaterialIcons name="save" size={18} color={theme.colors.textInverse} />
                <Text style={styles.saveBtnText}>{tr.common.save}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Day Pickers */}
      <DayPickerModal
        visible={showRentDayPicker}
        currentValue={rentDay ? parseInt(rentDay, 10) : undefined}
        onSelect={day => { setRentDay(String(day)); setShowRentDayPicker(false); }}
        onClose={() => setShowRentDayPicker(false)}
      />
      <DayPickerModal
        visible={showDuesDayPicker}
        currentValue={duesDay ? parseInt(duesDay, 10) : undefined}
        onSelect={day => { setDuesDay(String(day)); setShowDuesDayPicker(false); }}
        onClose={() => setShowDuesDayPicker(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerBack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  headerSub: { marginTop: 1, fontSize: 12, color: theme.colors.textSecondary },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  formContent: { padding: 14, paddingBottom: 32, gap: 12 },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },

  // Section Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  sectionSubtitle: { marginTop: 1, fontSize: 12, color: theme.colors.textSecondary },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 7 },

  // Input with icon
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
  },
  inputIcon: { marginRight: 6 },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },

  // Input with suffix
  inputSuffixRow: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFF' },
  inputSuffix: { flex: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: theme.colors.textPrimary },
  suffixBox: { justifyContent: 'center', paddingHorizontal: 10, backgroundColor: theme.colors.primaryLight, borderLeftWidth: 1, borderLeftColor: theme.colors.border },
  suffixText: { fontSize: 12, fontWeight: '700', color: theme.colors.primaryDark },

  // Icon chip row
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFF',
  },
  iconChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  iconChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  iconChipTextActive: { color: theme.colors.primary },

  // Segment control (2 tabs)
  segmentControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  segmentTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  segmentTabActive: { backgroundColor: theme.colors.primaryLight },
  segmentTabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  segmentTabTextActive: { color: theme.colors.primary },

  // Room type scroll
  roomTypeScroll: { marginTop: 2 },
  roomChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFF',
  },
  roomChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  roomChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  roomChipTextActive: { color: theme.colors.primary },

  // Pricing row
  priceRow: { flexDirection: 'row', gap: 10 },
  depositRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  currencyPills: { flexDirection: 'row', gap: 4 },
  currPill: {
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFF',
  },
  currPillActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  currPillText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  currPillTextActive: { color: theme.colors.primary },

  // Day picker button
  dayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dayBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  dayBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  dayBtnTextActive: { color: theme.colors.primary },

  // Amenity grid
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFF',
    position: 'relative',
  },
  amenityItemActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  amenityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  amenityIconWrapActive: { backgroundColor: '#fff' },
  amenityLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, flex: 1 },
  amenityLabelActive: { color: theme.colors.primaryDark },
  amenityCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCell: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoCellImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  coverBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddCell: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
  },
  photoAddText: { fontSize: 11, fontWeight: '600', color: theme.colors.primary },

  // People cards
  selectedPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  personAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  personName: { fontSize: 14, fontWeight: '700', color: theme.colors.primaryDark },
  personEmail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  emptyPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  emptyPersonText: { fontSize: 13, color: theme.colors.textMuted },

  // Search box
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },

  // Selection box
  selectionBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionSelected: { backgroundColor: theme.colors.primaryLight },
  optionDisabled: { opacity: 0.5 },
  optionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  optionTitleSelected: { color: theme.colors.primary },
  optionSub: { marginTop: 2, fontSize: 12, color: theme.colors.textSecondary },
  optionMeta: { marginTop: 3, fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic' },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  deleteBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    flexDirection: 'row',
    gap: 6,
  },
  deleteBtnText: { color: theme.colors.error, fontSize: 14, fontWeight: '700' },
  saveBtn: {
    flex: 1.45,
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    gap: 6,
  },
  saveBtnText: { color: theme.colors.textInverse, fontSize: 14, fontWeight: '700' },
}));
