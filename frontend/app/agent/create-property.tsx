import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { createProperty } from '../../services/appApi';
import { supabase } from '../../services/supabase';
import { uploadFileToSupabaseStorage } from '../../services/supabaseStorage';
import { createThemedStyles, useAppTheme } from '../theme';
import { tr } from '../translations';
import { parseCurrencyInput } from '../../utils/propertyHelpers';
import { CompactDatePicker } from '../../components/Shared/CompactDatePicker';
import DayPickerModal from '../../components/Shared/DayPickerModal';
import LocationPicker from '../../components/Shared/LocationPicker';
import { getUserData } from '../../hooks/useUserData';
import { getOfficeOwnerId, hasFullEmployeeAccess } from '../../utils/employeeAccess';
import { CurrencyInput } from '../../components/Shared/CurrencyInput';

type PropertyStatus = 'for-rent' | 'for-sale' | 'vacant';
type FurnishingType = 'furnished' | 'unfurnished';

interface UserItem {
  id: string;
  full_name: string;
  email: string;
  property_count?: number;
}

const TOTAL_STEPS = 6;

const STEP_META = [
  { label: 'Mülk Adı', icon: 'apartment' },
  { label: 'Konum & Fiyat', icon: 'location-on' },
  { label: 'Özellikler', icon: 'tune' },
  { label: 'Kişiler', icon: 'people' },
  { label: 'Belgeler', icon: 'folder' },
  { label: 'İnceleme', icon: 'checklist' },
];

// ─── Step Indicator ──────────────────────────────────────────────
function StepDots({ step }: { step: number }) {
  const styles = useStyles();
  return (
    <View style={styles.stepDots}>
      {STEP_META.map((meta, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <View key={idx} style={styles.stepDotItem}>
            <View
              style={[
                styles.stepDotCircle,
                done && styles.stepDotDone,
                active && styles.stepDotActive,
              ]}
            >
              {done
                ? <MaterialIcons name="check" size={12} color="#fff" />
                : <Text style={[styles.stepDotNum, active && styles.stepDotNumActive]}>{idx}</Text>
              }
            </View>
            {i < TOTAL_STEPS - 1 && (
              <View style={[styles.stepDotLine, done && styles.stepDotLineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Section Header ──────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <MaterialIcons name={icon as any} size={18} color={theme.colors.primary} />
      </View>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// ─── Day Picker Button ───────────────────────────────────────────
function DayPickerBtn({ value, onPress, label }: { value: string; onPress: () => void; label: string }) {
  const styles = useStyles();
  const theme = useAppTheme();
  const hasValue = !!value;
  return (
    <TouchableOpacity style={[styles.dayPickerBtn, hasValue && styles.dayPickerBtnActive]} onPress={onPress}>
      <MaterialIcons name="event" size={16} color={hasValue ? theme.colors.primary : theme.colors.textMuted} />
      <Text style={[styles.dayPickerText, hasValue && styles.dayPickerTextActive]}>
        {hasValue ? `Her ayın ${value}.` : label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function CreatePropertyWizard() {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const check = async () => {
        const user = await getUserData();
        setCurrentUser(user);
        const allowedRoles = ['agent', 'admin', 'manager', 'staff'];
        const canAccess = !!user && (allowedRoles.includes(user.role) || hasFullEmployeeAccess(user));
        if (!canAccess) router.replace('/agent/dashboard');
      };
      check();
    }, [])
  );

  const [step, setStep] = useState(1);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const bottomSafePadding = Math.max(insets.bottom, 12);
  const footerAwareStepContent = [
    styles.stepContent,
    step > 1 ? { paddingBottom: bottomBarHeight + 20 } : null,
  ];
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const currentUserId = currentUser?.id || null;
  const officeOwnerId = getOfficeOwnerId(currentUser);

  // Step 1
  const [propertyName, setPropertyName] = useState('');

  // Step 2
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [propertyType, setPropertyType] = useState('apartment');
  const [propertyStatus, setPropertyStatus] = useState<PropertyStatus>('for-rent');
  const [furnishing, setFurnishing] = useState<FurnishingType>('furnished');
  const [rentPrice, setRentPrice] = useState('');
  const [maintenanceFee, setMaintenanceFee] = useState('');
  const [rentDay, setRentDay] = useState('');
  const [duesDay, setDuesDay] = useState('');
  const [showRentDayPicker, setShowRentDayPicker] = useState(false);
  const [showDuesDayPicker, setShowDuesDayPicker] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency, setDepositCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [photos, setPhotos] = useState<string[]>([]);

  // Step 3
  const [area, setArea] = useState('');
  const [roomType, setRoomType] = useState('');
  const [heating, setHeating] = useState<'kombi' | 'merkezi' | 'yerden' | 'klima' | 'yok'>('kombi');
  const [amenities, setAmenities] = useState({
    parking: false,
    pool: false,
    gym: false,
    elevator: false,
    balcony: false,
    security: false,
    generator: false,
    garden: false,
    storage: false,
    jacuzzi: false,
  });
  const toggleAmenity = (key: keyof typeof amenities) =>
    setAmenities(prev => ({ ...prev, [key]: !prev[key] }));

  const [contractStart, setContractStart] = useState('');
  const [contractDuration, setContractDuration] = useState<number>(12);

  // Step 4
  const [tenantMode, setTenantMode] = useState<'none' | 'assign'>('none');
  const [tenants, setTenants] = useState<UserItem[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [landlords, setLandlords] = useState<UserItem[]>([]);
  const [loadingLandlords, setLoadingLandlords] = useState(false);
  const [selectedLandlord, setSelectedLandlord] = useState<string | null>(null);
  const [staff, setStaff] = useState<UserItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [tenantAssignments, setTenantAssignments] = useState<Record<string, { propertyId: string; label: string }>>({});
  const [tenantSearch, setTenantSearch] = useState('');
  const [landlordSearch, setLandlordSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  // Step 5
  const [daskDoc, setDaskDoc] = useState<string | null>(null);
  const [daskDocName, setDaskDocName] = useState<string | null>(null);
  const [contractDoc, setContractDoc] = useState<string | null>(null);
  const [contractDocName, setContractDocName] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // ─── Data Loaders ─────────────────────────────────────────────
  const loadTenants = async () => {
    if (tenants.length > 0) return;
    if (!officeOwnerId) return;
    setLoadingTenants(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'tenant')
        .eq('created_by', officeOwnerId)
        .order('full_name', { ascending: true });
      const nextTenants = (data || []) as UserItem[];
      setTenants(nextTenants);
      const tenantIds = nextTenants.map(t => t.id).filter(Boolean);
      if (tenantIds.length > 0) {
        const { data: assignedProps } = await supabase
          .from('properties')
          .select('id, tenant_id, address, description')
          .in('tenant_id', tenantIds)
          .eq('agent_id', officeOwnerId)
          .not('tenant_id', 'is', null);
        const assignmentMap: Record<string, { propertyId: string; label: string }> = {};
        (assignedProps || []).forEach((p: any) => {
          if (!p?.tenant_id) return;
          assignmentMap[p.tenant_id] = { propertyId: p.id, label: p.description || p.address || 'Mülk' };
        });
        setTenantAssignments(assignmentMap);
      }
    } catch { /* silent */ }
    finally { setLoadingTenants(false); }
  };

  const loadLandlords = async () => {
    if (landlords.length > 0) return;
    if (!officeOwnerId) return;
    setLoadingLandlords(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'landlord')
        .eq('created_by', officeOwnerId)
        .order('full_name', { ascending: true });
      setLandlords(data || []);
    } catch { /* silent */ }
    finally { setLoadingLandlords(false); }
  };

  const loadStaff = async () => {
    if (staff.length > 0) return;
    if (!officeOwnerId) return;
    setLoadingStaff(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'employee')
        .eq('created_by', officeOwnerId)
        .order('full_name', { ascending: true });
      setStaff(data || []);
    } catch { /* silent */ }
    finally { setLoadingStaff(false); }
  };

  // ─── Photo Picker ──────────────────────────────────────────────
  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 10 - photos.length,
    });
    if (!result.canceled) {
      setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Document Picker ──────────────────────────────────────────
  const pickDocument = async (type: 'dask' | 'contract') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const fileName = uri.split('/').pop() || 'dosya';
      if (type === 'dask') { setDaskDoc(uri); setDaskDocName(fileName); }
      else { setContractDoc(uri); setContractDocName(fileName); }
    }
  };

  // ─── Navigation ───────────────────────────────────────────────
  const handleNext = () => {
    if (step === 1) {
      if (!propertyName.trim()) { Alert.alert('Uyarı', 'Mülk adı boş olamaz.'); return; }
      setStep(2);
    } else if (step === 2) {
      if (!address.trim() || !city.trim() || !district.trim()) {
        Alert.alert('Uyarı', tr.location.bothRequired); return;
      }
      if (propertyStatus === 'for-rent' && !rentPrice.trim()) {
        Alert.alert('Uyarı', 'Kiralık mülkler için kira fiyatı girilmelidir.'); return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
      loadTenants(); loadLandlords(); loadStaff();
    } else if (step === 4) {
      if (!selectedLandlord) { Alert.alert('Uyarı', 'Lütfen bir ev sahibi seçin.'); return; }
      if (tenantMode === 'assign' && selectedTenant && tenantAssignments[selectedTenant]) {
        Alert.alert(tr.common.warning, tr.properties.tenantAlreadyAssignedError); return;
      }
      setStep(5);
    } else if (step === 5) {
      if (photos.length === 0) { Alert.alert('Fotoğraf Zorunlu', 'En az 1 fotoğraf yüklemelisiniz'); return; }
      setStep(6);
    } else if (step === 6) {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  // ─── Submit ───────────────────────────────────────────────────
  const handleComplete = async () => {
    setLoading(true);
    if (!currentUserId || !officeOwnerId) {
      Alert.alert(tr.common.error, 'Kullanıcı bilgisi yüklenemedi. Lütfen uygulamayı yeniden başlatın.');
      setLoading(false); return;
    }
    try {
      const status = selectedTenant ? 'occupied' : 'vacant';
      if (tenantMode === 'assign' && selectedTenant && tenantAssignments[selectedTenant]) {
        Alert.alert(tr.common.warning, tr.properties.tenantAlreadyAssignedError); return;
      }
      const contractStartFormatted = contractStart || null;
      const contractEndFormatted = contractStartFormatted && tenantMode === 'assign'
        ? (() => {
            const d = new Date(contractStartFormatted);
            d.setMonth(d.getMonth() + contractDuration);
            return d.toISOString().split('T')[0];
          })()
        : null;

      // room_type bilgisini description'a encode et (DB sütunu eklendiğinde güncellenir)
      const descriptionWithRoom = roomType
        ? `${roomType} | ${propertyName}`
        : propertyName;

      const result = await createProperty({
        description: descriptionWithRoom,
        address,
        city,
        district,
        property_type: propertyType,
        status,
        monthly_rent: parseFloat(rentPrice) || 0,
        dues_amount: parseFloat(maintenanceFee) || null,
        rent_day: rentDay ? parseInt(rentDay, 10) : null,
        dues_day: duesDay ? parseInt(duesDay, 10) : null,
        contract_start: tenantMode === 'assign' ? contractStartFormatted : null,
        contract_end: contractEndFormatted,
        contract_duration: tenantMode === 'assign' ? contractDuration : null,
        landlord_id: selectedLandlord,
        tenant_id: selectedTenant || null,
        employee_id: selectedStaff || null,
        is_furnished: furnishing === 'furnished',
        amenities,
        area: area ? parseInt(area, 10) : null,
        heating: heating || null,
        deposit_amount: selectedTenant && depositAmount ? parseCurrencyInput(String(depositAmount)) : null,
        deposit_currency: selectedTenant ? depositCurrency : null,
      });

      const propertyId = result.property_id;

      if (propertyId && photos.length > 0) {
        const imageUrls: string[] = [];
        for (let i = 0; i < photos.length; i++) {
          try {
            const uri = photos[i];
            const path = `${propertyId}/${Date.now()}_${i}.jpg`;
            const upload = await uploadFileToSupabaseStorage({
              bucket: 'property-images',
              path,
              fileUri: uri,
              contentType: 'image/jpeg',
              upsert: true,
              client: supabase,
            });
            if (upload.publicUrl) imageUrls.push(upload.publicUrl);
          } catch { /* skip failed uploads */ }
        }
        if (imageUrls.length > 0) {
          await supabase.from('properties').update({ images: imageUrls }).eq('id', propertyId);
        }
      }

      if (propertyId) router.replace(`/agent/property-detail?id=${propertyId}` as any);
      else router.replace('/agent/properties');
    } catch {
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Option Data ──────────────────────────────────────────────
  const PROPERTY_TYPES = [
    { key: 'apartment', label: 'Daire', icon: 'apartment' },
    { key: 'house', label: 'Müstakil', icon: 'home' },
    { key: 'office', label: 'Ofis', icon: 'store' },
    { key: 'land', label: 'Arsa', icon: 'landscape' },
  ];

  const STATUS_OPTS: { key: PropertyStatus; label: string; icon: string }[] = [
    { key: 'for-rent', label: 'Kiralık', icon: 'vpn-key' },
    { key: 'for-sale', label: 'Satılık', icon: 'sell' },
    { key: 'vacant', label: 'Boş', icon: 'check-circle-outline' },
  ];

  const ROOM_TYPES = ['Stüdyo', '1+0', '1+1', '2+1', '3+1', '4+1', '4+2', '5+1'];

  const HEATING_OPTS = [
    { key: 'kombi', label: 'Kombi', icon: 'local-fire-department' },
    { key: 'merkezi', label: 'Merkezi', icon: 'account-balance' },
    { key: 'yerden', label: 'Yerden', icon: 'waves' },
    { key: 'klima', label: 'Klima', icon: 'ac-unit' },
    { key: 'yok', label: 'Yok', icon: 'block' },
  ] as const;

  const AMENITY_OPTS: { key: keyof typeof amenities; label: string; icon: string }[] = [
    { key: 'parking', label: 'Otopark', icon: 'local-parking' },
    { key: 'pool', label: 'Havuz', icon: 'pool' },
    { key: 'gym', label: 'Spor Salonu', icon: 'fitness-center' },
    { key: 'elevator', label: 'Asansör', icon: 'elevator' },
    { key: 'balcony', label: 'Balkon', icon: 'balcony' },
    { key: 'security', label: 'Güvenlik', icon: 'security' },
    { key: 'generator', label: 'Jeneratör', icon: 'bolt' },
    { key: 'garden', label: 'Bahçe', icon: 'grass' },
    { key: 'storage', label: 'Depo', icon: 'archive' },
    { key: 'jacuzzi', label: 'Jakuzi', icon: 'spa' },
  ];

  // ─────────────────────────────────────────────────────────────
  // STEP 1: Mülk Adı
  // ─────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.step1Content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.step1Card}>
          <View style={styles.step1IconWrap}>
            <MaterialIcons name="apartment" size={40} color={theme.colors.primary} />
          </View>
          <Text style={styles.step1Title}>Mülk Adı</Text>
          <Text style={styles.step1Sub}>Kiracı ve ev sahibi bu başlığı görecek</Text>
          <View style={styles.step1InputWrap}>
            <MaterialIcons name="apartment" size={20} color={theme.colors.textMuted} style={styles.step1InputIcon} />
            <TextInput
              style={styles.step1Input}
              placeholder="Örn: Kadıköy 3+1 Daire"
              placeholderTextColor={theme.colors.textMuted}
              value={propertyName}
              onChangeText={setPropertyName}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Devam Et</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ─────────────────────────────────────────────────────────────
  // STEP 2: Konum & Fiyatlandırma
  // ─────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.flex}>
      <ScrollView
        contentContainerStyle={footerAwareStepContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {/* Konum */}
        <View style={styles.card}>
          <SectionHeader icon="location-on" title="Konum" subtitle="Mülkün tam adresi" />

          <Text style={styles.fieldLabel}>Açık Adres</Text>
          <TextInput
            style={styles.input}
            placeholder="Sokak, bina no, daire no…"
            placeholderTextColor={theme.colors.textMuted}
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <View style={{ marginTop: 4 }}>
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

        {/* Mülk Tipi & Durum */}
        <View style={styles.card}>
          <SectionHeader icon="home-work" title="Mülk Tipi & Durum" />

          <Text style={styles.fieldLabel}>Mülk Tipi</Text>
          <View style={styles.iconChipRow}>
            {PROPERTY_TYPES.map(opt => {
              const sel = propertyType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.iconChip, sel && styles.iconChipSel]}
                  onPress={() => setPropertyType(opt.key)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name={opt.icon as any} size={20} color={sel ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.iconChipText, sel && styles.iconChipTextSel]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Durum</Text>
          <View style={styles.iconChipRow}>
            {STATUS_OPTS.map(opt => {
              const sel = propertyStatus === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.iconChip, sel && styles.iconChipSel]}
                  onPress={() => setPropertyStatus(opt.key)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name={opt.icon as any} size={18} color={sel ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.iconChipText, sel && styles.iconChipTextSel]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Eşya Durumu</Text>
          <View style={styles.segmentControl}>
            {[
              { key: 'furnished', label: 'Mobilyalı' },
              { key: 'unfurnished', label: 'Mobilyasız' },
            ].map(opt => {
              const sel = furnishing === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.segmentItem, sel && styles.segmentItemSel]}
                  onPress={() => setFurnishing(opt.key as FurnishingType)}
                >
                  <Text style={[styles.segmentText, sel && styles.segmentTextSel]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Fiyatlandırma */}
        <View style={styles.card}>
          <SectionHeader icon="payments" title="Fiyatlandırma" subtitle="Aylık kira ve aidat bilgileri" />

          {propertyStatus === 'for-rent' && (
            <>
              <Text style={styles.fieldLabel}>Aylık Kira</Text>
              <View style={styles.inputWithSuffix}>
                <CurrencyInput
                  inputStyle={styles.inputInner}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                  value={rentPrice}
                  onValueChange={setRentPrice}
                />
                <View style={styles.inputSuffix}>
                  <Text style={styles.inputSuffixText}>₺/ay</Text>
                </View>
              </View>
            </>
          )}

          <Text style={[styles.fieldLabel, propertyStatus === 'for-rent' ? { marginTop: 14 } : {}]}>Aidat</Text>
          <View style={styles.inputWithSuffix}>
            <CurrencyInput
              inputStyle={styles.inputInner}
              placeholder="0"
              placeholderTextColor={theme.colors.textMuted}
              value={maintenanceFee}
              onValueChange={setMaintenanceFee}
            />
            <View style={styles.inputSuffix}>
              <Text style={styles.inputSuffixText}>₺/ay</Text>
            </View>
          </View>

          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Kira Günü</Text>
              <DayPickerBtn value={rentDay} label="Gün Seçin" onPress={() => setShowRentDayPicker(true)} />
              <DayPickerModal
                visible={showRentDayPicker}
                onClose={() => setShowRentDayPicker(false)}
                onSelect={(day) => setRentDay(String(day))}
                currentValue={rentDay ? parseInt(rentDay) : undefined}
                title="Kira Günü Seçin"
              />
            </View>
            <View style={styles.colHalf}>
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Aidat Günü</Text>
              <DayPickerBtn value={duesDay} label="Gün Seçin" onPress={() => setShowDuesDayPicker(true)} />
              <DayPickerModal
                visible={showDuesDayPicker}
                onClose={() => setShowDuesDayPicker(false)}
                onSelect={(day) => setDuesDay(String(day))}
                currentValue={duesDay ? parseInt(duesDay) : undefined}
                title="Aidat Günü Seçin"
              />
            </View>
          </View>
        </View>

        {/* Fotoğraflar */}
        <View style={styles.card}>
          <SectionHeader icon="photo-camera" title="Mülk Fotoğrafları" subtitle="En az 1 fotoğraf zorunlu" />

          <TouchableOpacity style={styles.photoUploadArea} onPress={pickPhotos} activeOpacity={0.85}>
            <MaterialIcons name="add-photo-alternate" size={32} color={theme.colors.primary} />
            <Text style={styles.photoUploadTitle}>Fotoğraf Ekle</Text>
            <Text style={styles.photoUploadHint}>JPG, PNG • Çoklu seçim • Maks. 10 adet</Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoGridItem}>
                  <Image source={{ uri }} style={styles.photoGridImg} />
                  {i === 0 && (
                    <View style={styles.photoCoverBadge}>
                      <Text style={styles.photoCoverText}>KAPAK</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => removePhoto(i)}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <MaterialIcons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 10 && (
                <TouchableOpacity style={styles.photoAddMore} onPress={pickPhotos}>
                  <MaterialIcons name="add" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ─────────────────────────────────────────────────────────────
  // STEP 3: Özellikler
  // ─────────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.flex}>
      <ScrollView
        contentContainerStyle={footerAwareStepContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={styles.card}>
          <SectionHeader icon="straighten" title="Boyut & Tip" />

          {/* m² */}
          <Text style={styles.fieldLabel}>Metrekare (m²)</Text>
          <View style={styles.inputWithSuffix}>
            <TextInput
              style={styles.inputInner}
              placeholder="Örn: 85"
              placeholderTextColor={theme.colors.textMuted}
              value={area}
              onChangeText={setArea}
              keyboardType="numeric"
            />
            <View style={styles.inputSuffix}>
              <Text style={styles.inputSuffixText}>m²</Text>
            </View>
          </View>

          {/* Oda Tipi */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Oda Sayısı</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.roomTypeRow}>
              {ROOM_TYPES.map(rt => {
                const sel = roomType === rt;
                return (
                  <TouchableOpacity
                    key={rt}
                    style={[styles.roomTypeChip, sel && styles.roomTypeChipSel]}
                    onPress={() => setRoomType(prev => prev === rt ? '' : rt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roomTypeText, sel && styles.roomTypeTextSel]}>{rt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Isınma */}
        <View style={styles.card}>
          <SectionHeader icon="thermostat" title="Isınma Sistemi" />
          <View style={styles.iconChipRow}>
            {HEATING_OPTS.map(opt => {
              const sel = heating === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.iconChip, sel && styles.iconChipSel]}
                  onPress={() => setHeating(opt.key)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name={opt.icon as any} size={18} color={sel ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.iconChipText, sel && styles.iconChipTextSel]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Olanaklar */}
        <View style={styles.card}>
          <SectionHeader icon="check-circle-outline" title="Olanaklar" subtitle="Mülkte bulunanları seçin" />
          <View style={styles.amenityGrid}>
            {AMENITY_OPTS.map(opt => {
              const sel = amenities[opt.key];
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.amenityItem, sel && styles.amenityItemSel]}
                  onPress={() => toggleAmenity(opt.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.amenityIconWrap, sel && styles.amenityIconWrapSel]}>
                    <MaterialIcons
                      name={opt.icon as any}
                      size={20}
                      color={sel ? theme.colors.primary : theme.colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.amenityLabel, sel && styles.amenityLabelSel]}>{opt.label}</Text>
                  {sel && <MaterialIcons name="check" size={14} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ─────────────────────────────────────────────────────────────
  // STEP 4: Kişiler
  // ─────────────────────────────────────────────────────────────
  const renderStep4 = () => (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.flex}>
      <ScrollView
        contentContainerStyle={footerAwareStepContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {/* ── Ev Sahibi ── */}
        <View style={styles.card}>
          <SectionHeader icon="business" title="Ev Sahibi" subtitle="Zorunlu alan" />

          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={18} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={tr.properties.searchLandlordPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={landlordSearch}
              onChangeText={setLandlordSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {landlordSearch ? (
              <TouchableOpacity onPress={() => setLandlordSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {loadingLandlords ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
          ) : landlords.length === 0 ? (
            <Text style={styles.emptyText}>Kayıtlı ev sahibi bulunamadı.</Text>
          ) : (
            landlords
              .filter(l => {
                const q = landlordSearch.trim().toLowerCase();
                if (!q) return true;
                return (l.full_name || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q);
              })
              .map(item => {
                const sel = selectedLandlord === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.personItem, sel && styles.personItemSel]}
                    onPress={() => setSelectedLandlord(item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.personAvatar, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.personAvatarText}>{(item.full_name || 'E').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.personInfo}>
                      <Text style={styles.personName}>{item.full_name}</Text>
                      <Text style={styles.personEmail}>{item.email}</Text>
                    </View>
                    {sel && <MaterialIcons name="check-circle" size={22} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })
          )}
        </View>

        {/* ── Kiracı ── */}
        <View style={styles.card}>
          <SectionHeader icon="person" title="Kiracı" subtitle="Atanmış kiracı var mı?" />

          <View style={styles.segmentControl}>
            {[{ key: 'none', label: 'Kiracısız' }, { key: 'assign', label: 'Kiracı Ata' }].map(opt => {
              const sel = tenantMode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.segmentItem, sel && styles.segmentItemSel]}
                  onPress={() => { setTenantMode(opt.key as 'none' | 'assign'); if (opt.key === 'none') setSelectedTenant(null); }}
                >
                  <Text style={[styles.segmentText, sel && styles.segmentTextSel]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {tenantMode === 'assign' && (
            <View style={{ marginTop: 14 }}>
              <View style={styles.searchBox}>
                <MaterialIcons name="search" size={18} color={theme.colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={tr.properties.searchTenantPlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  value={tenantSearch}
                  onChangeText={setTenantSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {tenantSearch ? (
                  <TouchableOpacity onPress={() => setTenantSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {loadingTenants ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
              ) : tenants.length === 0 ? (
                <Text style={styles.emptyText}>Kayıtlı kiracı bulunamadı.</Text>
              ) : (
                tenants
                  .filter(t => {
                    const q = tenantSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (t.full_name || '').toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q);
                  })
                  .map(item => {
                    const isSelf = !!currentUserId && item.id === currentUserId;
                    const assignment = tenantAssignments[item.id];
                    const isDisabled = isSelf || !!assignment;
                    const sel = selectedTenant === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.personItem, sel && styles.personItemSel, isDisabled && styles.personItemDisabled]}
                        onPress={() => { if (isDisabled) return; setSelectedTenant(prev => prev === item.id ? null : item.id); }}
                        disabled={isDisabled}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.personAvatar, { backgroundColor: theme.colors.copperLight }]}>
                          <Text style={[styles.personAvatarText, { color: theme.colors.copper }]}>{(item.full_name || 'K').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.personInfo}>
                          <Text style={styles.personName}>{item.full_name}</Text>
                          <Text style={styles.personEmail}>{item.email}</Text>
                          {isSelf ? <Text style={styles.personMeta}>{tr.properties.tenantSelfNotSelectable}</Text>
                            : assignment ? <Text style={styles.personMeta}>{tr.properties.tenantAlreadyAssignedLabel.replace('{property}', assignment.label)}</Text>
                            : null}
                        </View>
                        {sel && <MaterialIcons name="check-circle" size={22} color={theme.colors.primary} />}
                      </TouchableOpacity>
                    );
                  })
              )}

              {/* Sözleşme */}
              <View style={[styles.sectionDivider, { marginTop: 16 }]} />
              <SectionHeader icon="description" title="Sözleşme Bilgileri" subtitle="Kira dönemi detayları" />

              <Text style={styles.fieldLabel}>Başlangıç Tarihi</Text>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setIsDatePickerVisible(true)}>
                <MaterialIcons name="calendar-today" size={18} color={contractStart ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.datePickerText, contractStart && styles.datePickerTextActive]}>
                  {contractStart ? contractStart.split('-').reverse().join('/') : 'Tarih Seçin'}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <CompactDatePicker
                visible={isDatePickerVisible}
                onClose={() => setIsDatePickerVisible(false)}
                onSelect={(date) => setContractStart(date)}
                currentValue={contractStart}
                mode="date"
                title="Sözleşme Başlangıç"
              />

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Sözleşme Süresi</Text>
              <View style={styles.durationRow}>
                {([6, 12, 24, 36] as const).map(m => {
                  const sel = contractDuration === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.durationChip, sel && styles.durationChipSel]}
                      onPress={() => setContractDuration(m)}
                    >
                      <Text style={[styles.durationText, sel && styles.durationTextSel]}>{m} Ay</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {selectedTenant && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.sectionDivider} />
              <SectionHeader icon="account-balance-wallet" title="Depozito" subtitle="Kiracı atandığında" />

              <Text style={styles.fieldLabel}>Para Birimi</Text>
              <View style={styles.segmentControl}>
                {(['TRY', 'USD', 'EUR'] as const).map(curr => {
                  const sel = depositCurrency === curr;
                  return (
                    <TouchableOpacity key={curr} style={[styles.segmentItem, sel && styles.segmentItemSel]} onPress={() => setDepositCurrency(curr)}>
                      <Text style={[styles.segmentText, sel && styles.segmentTextSel]}>
                        {curr === 'TRY' ? tr.propertyWizard.currencyTRY : curr === 'USD' ? tr.propertyWizard.currencyUSD : tr.propertyWizard.currencyEUR}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Depozito Miktarı</Text>
              <View style={styles.inputWithSuffix}>
                <CurrencyInput
                  inputStyle={styles.inputInner}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                  value={depositAmount}
                  onValueChange={setDepositAmount}
                />
                <View style={styles.inputSuffix}>
                  <Text style={styles.inputSuffixText}>{depositCurrency}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Personel ── */}
        <View style={styles.card}>
          <SectionHeader icon="badge" title="Sorumlu Personel" subtitle="Opsiyonel" />

          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={18} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={tr.properties.searchEmployeePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={staffSearch}
              onChangeText={setStaffSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {staffSearch ? (
              <TouchableOpacity onPress={() => setStaffSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {loadingStaff ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
          ) : staff.length === 0 ? (
            <Text style={styles.emptyText}>Kayıtlı personel bulunamadı.</Text>
          ) : (
            staff
              .filter(s => {
                const q = staffSearch.trim().toLowerCase();
                if (!q) return true;
                return (s.full_name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
              })
              .map(item => {
                const sel = selectedStaff === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.personItem, sel && styles.personItemSel]}
                    onPress={() => setSelectedStaff(prev => prev === item.id ? null : item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.personAvatar, { backgroundColor: theme.colors.infoLight }]}>
                      <Text style={[styles.personAvatarText, { color: theme.colors.info }]}>{(item.full_name || 'P').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.personInfo}>
                      <Text style={styles.personName}>{item.full_name}</Text>
                      <Text style={styles.personEmail}>{item.email}</Text>
                    </View>
                    {sel && <MaterialIcons name="check-circle" size={22} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ─────────────────────────────────────────────────────────────
  // STEP 5: Belgeler
  // ─────────────────────────────────────────────────────────────
  const renderStep5 = () => (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.flex}>
      <ScrollView
        contentContainerStyle={footerAwareStepContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <SectionHeader icon="folder-special" title="Mülk Belgeleri" subtitle="Opsiyonel — sonradan da yüklenebilir" />

          {/* DASK */}
          <Text style={styles.fieldLabel}>DASK Sigorta Poliçesi</Text>
          <TouchableOpacity
            style={[styles.docCard, daskDoc && styles.docCardDone]}
            onPress={() => pickDocument('dask')}
            activeOpacity={0.85}
          >
            <View style={[styles.docIconWrap, daskDoc && styles.docIconWrapDone]}>
              <MaterialIcons
                name={daskDoc ? 'task' : 'description'}
                size={26}
                color={daskDoc ? theme.colors.success : theme.colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.docCardTitle, daskDoc && { color: theme.colors.success }]}>
                {daskDoc ? daskDocName || 'Yüklendi' : 'Dosya Seç'}
              </Text>
              <Text style={styles.docCardHint}>PDF, JPG, PNG • Maks. 10 MB</Text>
            </View>
            <MaterialIcons
              name={daskDoc ? 'check-circle' : 'upload'}
              size={22}
              color={daskDoc ? theme.colors.success : theme.colors.textMuted}
            />
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          {/* Sözleşme */}
          <Text style={styles.fieldLabel}>Kira Sözleşmesi</Text>
          <TouchableOpacity
            style={[styles.docCard, contractDoc && styles.docCardDone]}
            onPress={() => pickDocument('contract')}
            activeOpacity={0.85}
          >
            <View style={[styles.docIconWrap, contractDoc && styles.docIconWrapDone]}>
              <MaterialIcons
                name={contractDoc ? 'task' : 'article'}
                size={26}
                color={contractDoc ? theme.colors.success : theme.colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.docCardTitle, contractDoc && { color: theme.colors.success }]}>
                {contractDoc ? contractDocName || 'Yüklendi' : 'Dosya Seç'}
              </Text>
              <Text style={styles.docCardHint}>PDF, JPG, PNG • Maks. 10 MB</Text>
            </View>
            <MaterialIcons
              name={contractDoc ? 'check-circle' : 'upload'}
              size={22}
              color={contractDoc ? theme.colors.success : theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ─────────────────────────────────────────────────────────────
  // STEP 6: İnceleme
  // ─────────────────────────────────────────────────────────────
  const renderStep6 = () => {
    const landlordObj = landlords.find(l => l.id === selectedLandlord);
    const tenantObj = tenants.find(t => t.id === selectedTenant);
    const docCount = (daskDoc ? 1 : 0) + (contractDoc ? 1 : 0);
    const HEATING_OPTS_MAP: Record<string, string> = { kombi: 'Kombi', merkezi: 'Merkezi', yerden: 'Yerden', klima: 'Klima', yok: 'Yok' };
    const STATUS_LABEL: Record<string, string> = { 'for-rent': 'Kiralık', 'for-sale': 'Satılık', 'vacant': 'Boş' };
    const TYPE_LABEL: Record<string, string> = { apartment: 'Daire', house: 'Müstakil', office: 'Ofis', land: 'Arsa' };

    const rows = [
      { label: 'Mülk Adı', value: propertyName || '—' },
      { label: 'Şehir / İlçe', value: `${city} / ${district}` },
      { label: 'Adres', value: address || '—' },
      { label: 'Mülk Tipi', value: TYPE_LABEL[propertyType] || propertyType },
      { label: 'Durum', value: STATUS_LABEL[propertyStatus] || propertyStatus },
      { label: 'Eşya', value: furnishing === 'furnished' ? 'Mobilyalı' : 'Mobilyasız' },
      { label: 'Kira', value: rentPrice ? `₺${rentPrice}/ay` : '—' },
      { label: 'Aidat', value: maintenanceFee ? `₺${maintenanceFee}/ay` : '—' },
      { label: 'Alan', value: area ? `${area} m²` : '—' },
      { label: 'Oda Tipi', value: roomType || '—' },
      { label: 'Isınma', value: HEATING_OPTS_MAP[heating] || heating },
      { label: 'Olanaklar', value: `${Object.values(amenities).filter(Boolean).length} seçili` },
      { label: 'Fotoğraflar', value: `${photos.length} adet` },
      { label: 'Ev Sahibi', value: landlordObj?.full_name || '—' },
      { label: 'Kiracı', value: tenantObj?.full_name || 'Yok' },
      { label: 'Belgeler', value: docCount > 0 ? `${docCount} belge` : 'Yok' },
    ];

    return (
      <Animated.View entering={FadeInDown.duration(350)} style={styles.flex}>
        <ScrollView contentContainerStyle={footerAwareStepContent} showsVerticalScrollIndicator={false}>
          <View style={styles.reviewBanner}>
            <MaterialIcons name="check-circle-outline" size={32} color={theme.colors.success} />
            <View>
              <Text style={styles.reviewBannerTitle}>Her şey hazır!</Text>
              <Text style={styles.reviewBannerSub}>Bilgileri gözden geçirin ve mülkü oluşturun</Text>
            </View>
          </View>

          <View style={styles.card}>
            {rows.map((row, i) => (
              <View key={row.label} style={[styles.reviewRow, i === rows.length - 1 && styles.reviewRowLast]}>
                <Text style={styles.reviewLabel}>{row.label}</Text>
                <Text style={styles.reviewValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerStepLabel}>{STEP_META[step - 1]?.label}</Text>
          <Text style={styles.headerStepCount}>Adım {step} / {TOTAL_STEPS}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Step Dots */}
      <StepDots step={step} />

      {/* Content */}
      <View style={styles.flex}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
      </View>

      {/* Bottom Bar (step 1 kendi butonunu taşır) */}
      {step > 1 && (
        <View
          style={[styles.bottomBar, { paddingBottom: bottomSafePadding }]}
          onLayout={(event) => setBottomBarHeight(event.nativeEvent.layout.height)}
        >
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleBack} activeOpacity={0.85}>
            <MaterialIcons name="arrow-back" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.secondaryBtnText}>Geri</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, styles.primaryBtnFlex, loading && styles.btnDisabled]}
            onPress={handleNext}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : step === 6 ? (
              <>
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Mülkü Oluştur</Text>
              </>
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Devam Et</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: theme.colors.background,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerStepLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  headerStepCount: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  headerRight: { width: 38 },

  // Step Dots
  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  stepDotItem: { flexDirection: 'row', alignItems: 'center' },
  stepDotCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1.5, borderColor: theme.colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  stepDotDone: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stepDotNum: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
  stepDotNumActive: { color: theme.colors.primary },
  stepDotLine: {
    width: 24, height: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: 3,
  },
  stepDotLineDone: { backgroundColor: theme.colors.primary },

  // Scroll Content
  stepContent: { padding: 16, paddingBottom: 32, gap: 16 },
  step1Content: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  sectionSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  sectionDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 16 },

  // Field
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 },

  // Input
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: theme.colors.textPrimary,
  },
  inputWithSuffix: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 12, overflow: 'hidden',
  },
  inputInner: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: theme.colors.textPrimary,
  },
  inputSuffix: {
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: theme.colors.surface2,
    borderLeftWidth: 1, borderLeftColor: theme.colors.border,
  },
  inputSuffixText: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted },

  twoCol: { flexDirection: 'row', gap: 12 },
  colHalf: { flex: 1 },

  // Day Picker Button
  dayPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  dayPickerBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  dayPickerText: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '500' },
  dayPickerTextActive: { color: theme.colors.primary, fontWeight: '700' },

  // Icon Chip Row
  iconChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  iconChipSel: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  iconChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  iconChipTextSel: { color: theme.colors.primary },

  // Segment Control
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface2,
    borderRadius: 12, padding: 3,
  },
  segmentItem: {
    flex: 1, paddingVertical: 9,
    alignItems: 'center', borderRadius: 10,
  },
  segmentItemSel: { backgroundColor: theme.colors.surface, ...theme.shadows.sm },
  segmentText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  segmentTextSel: { color: theme.colors.textPrimary },

  // Room Type
  roomTypeRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  roomTypeChip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  roomTypeChipSel: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  roomTypeText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  roomTypeTextSel: { color: theme.colors.primary },

  // Amenity Grid
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '47%', paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  amenityItemSel: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  amenityIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  amenityIconWrapSel: { backgroundColor: `${theme.colors.primary}20` },
  amenityLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, flex: 1 },
  amenityLabelSel: { color: theme.colors.primary },

  // Photo Upload
  photoUploadArea: {
    borderWidth: 1.5, borderColor: theme.colors.primary,
    borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 24, alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.primaryLight,
  },
  photoUploadTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  photoUploadHint: { fontSize: 12, color: theme.colors.textMuted },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  photoGridItem: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  photoGridImg: { width: '100%', height: '100%' },
  photoCoverBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 3, alignItems: 'center',
  },
  photoCoverText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  photoRemoveBtn: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoAddMore: {
    width: 80, height: 80, borderRadius: 10,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },

  // Person List
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, paddingVertical: 0 },
  personItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.background, marginBottom: 8,
  },
  personItemSel: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  personItemDisabled: { opacity: 0.5 },
  personAvatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  personAvatarText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  personInfo: { flex: 1 },
  personName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  personEmail: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  personMeta: { fontSize: 11, color: theme.colors.warning, marginTop: 2 },
  emptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 10 },

  // Date Picker Button
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  datePickerText: { flex: 1, fontSize: 14, color: theme.colors.textMuted, fontWeight: '500' },
  datePickerTextActive: { color: theme.colors.textPrimary },

  // Duration Chips
  durationRow: { flexDirection: 'row', gap: 8 },
  durationChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  durationChipSel: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  durationText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  durationTextSel: { color: theme.colors.primary },

  // Document Cards
  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderStyle: 'dashed', borderRadius: 14,
    padding: 16, backgroundColor: theme.colors.background,
  },
  docCardDone: { borderColor: theme.colors.success, borderStyle: 'solid', backgroundColor: theme.colors.successLight },
  docIconWrap: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  docIconWrapDone: { backgroundColor: `${theme.colors.success}20` },
  docCardTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  docCardHint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },

  // Review
  reviewBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.colors.successLight,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: `${theme.colors.success}30`,
  },
  reviewBannerTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.successText },
  reviewBannerSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  reviewRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  reviewRowLast: { borderBottomWidth: 0 },
  reviewLabel: { fontSize: 13, color: theme.colors.textMuted, flex: 1 },
  reviewValue: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, flex: 1.5, textAlign: 'right' },

  // Step 1 Card
  step1Card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24, padding: 28,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  step1IconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  step1Title: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 6 },
  step1Sub: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  step1InputWrap: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%',
    backgroundColor: theme.colors.background,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 14, paddingHorizontal: 14, marginBottom: 20,
  },
  step1InputIcon: { marginRight: 8 },
  step1Input: {
    flex: 1, paddingVertical: 14,
    fontSize: 16, color: theme.colors.textPrimary,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: theme.colors.primary,
    paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 14, width: '100%',
    ...theme.shadows.sm,
  },
  primaryBtnFlex: { flex: 1, width: undefined, paddingHorizontal: 0 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: theme.colors.surface2,
    paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  btnDisabled: { opacity: 0.55 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
}));
