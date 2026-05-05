import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeOutLeft, FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { createThemedStyles, useAppTheme } from '../theme';
import { tr } from '../translations';
import { CompactDatePicker } from '../../components/Shared/CompactDatePicker';
import { CurrencyInput } from '../../components/Shared/CurrencyInput';
import { supabase } from '../../services/supabase';
import { createUser } from '../../services/appApi';
import { getUserData } from '../../hooks/useUserData';
import { StepIndicator } from '../../components/Shared/StepIndicator';
import { uploadFileToSupabaseStorage } from '../../services/supabaseStorage';
import { getIoniconForContactIdentifier } from '../../utils/contactIdentifier';
import LocationPicker from '../../components/Shared/LocationPicker';
import { canManageOfficeRecords, getOfficeOwnerId } from '../../utils/employeeAccess';

const STEP_LABELS = [
  tr.tenantWizard.step1Title,
  tr.tenantWizard.step2Title,
  tr.tenantWizard.step3Title,
  tr.tenantWizard.step4Title,
];

const CONTRACT_DURATIONS = [
  { value: 6, label: '6 ay' },
  { value: 12, label: '1 yıl' },
  { value: 24, label: '2 yıl' },
  { value: 36, label: '3 yıl' },
];


export default function AddTenantWizard() {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [property, setProperty] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Step 1 — Identity
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');

  // Step 2 — Contract
  const [contractDuration, setContractDuration] = useState(12);
  const [contractStart, setContractStart] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [rentDay, setRentDay] = useState('');
  const [duesAmount, setDuesAmount] = useState('');
  const [duesDay, setDuesDay] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [specialTerms, setSpecialTerms] = useState('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // Step 3 — Documents
  type DocFile = { uri: string; type: string; name: string } | null;
  const [identityDoc, setIdentityDoc] = useState<DocFile>(null);
  const [incomeDoc, setIncomeDoc] = useState<DocFile>(null);
  const [contractDoc, setContractDoc] = useState<DocFile>(null);

  const loadProperty = useCallback(async () => {
    const { data } = await supabase.from('properties').select('*').eq('id', propertyId).single();
    if (data) {
      if (data.tenant_id) {
        Alert.alert(
          tr.common.warning,
          tr.tenantWizard.propertyAlreadyHasTenant,
          [
            {
              text: tr.common.ok,
              onPress: () => router.replace(`/agent/property-detail?id=${propertyId}` as any),
            },
          ]
        );
        return;
      }
      setProperty(data);
      if (data.monthly_rent) setMonthlyRent(data.monthly_rent.toString());
      if (data.dues_amount) setDuesAmount(data.dues_amount.toString());
      if (data.rent_day) setRentDay(data.rent_day.toString());
      if (data.dues_day) setDuesDay(data.dues_day.toString());
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyId) void loadProperty();
  }, [propertyId, loadProperty]);

  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = await getUserData();
      if (!currentUser) {
        router.replace('/' as any);
        return;
      }
      if (!canManageOfficeRecords(currentUser)) {
        Alert.alert(tr.common.warning, 'Bu işlem için tam yetkili çalışan veya emlakçı hesabı gerekir.');
        router.replace(`/agent/property-detail?id=${propertyId}` as any);
      }
    };

    checkAccess();
  }, [propertyId]);

  // ─── Document Picker ───────────────────────────────────────────
  // Local UI helpers need access to the current themed styles.
  const DocumentUploadCard = ({ title, subtitle, icon, uploaded, fileName, onPress, onRemove }: {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    uploaded: boolean;
    fileName?: string;
    onPress: () => void;
    onRemove?: () => void;
  }) => (
    <View style={[styles.uploadCard, uploaded && styles.uploadCardDone]}>
      <TouchableOpacity
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.uploadIcon}>
          <Ionicons
            name={uploaded ? 'checkmark-circle' : icon}
            size={32}
            color={uploaded ? theme.colors.success : theme.colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.uploadTitle}>{title}</Text>
          <Text style={styles.uploadSubtitle} numberOfLines={1}>
            {uploaded && fileName ? fileName : (uploaded ? tr.tenantWizard.uploaded : subtitle)}
          </Text>
        </View>
      </TouchableOpacity>
      {uploaded && onRemove && (
        <TouchableOpacity onPress={onRemove} style={{ padding: 4 }}>
          <Ionicons name="close-circle" size={22} color={theme.colors.error} />
        </TouchableOpacity>
      )}
      {!uploaded && <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.textMuted} />}
    </View>
  );

  const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );

  const DocStatusRow = ({ label, uploaded }: { label: string; uploaded: boolean }) => (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <View style={[styles.docStatusPill, { backgroundColor: uploaded ? theme.colors.successLight : theme.colors.warningLight }]}>
        <Ionicons
          name={uploaded ? 'checkmark-circle' : 'time-outline'}
          size={14}
          color={uploaded ? theme.colors.success : theme.colors.warning}
        />
        <Text style={{ fontSize: 12, fontWeight: '600', color: uploaded ? theme.colors.successText : theme.colors.warningText }}>
          {uploaded ? tr.tenantWizard.uploaded : tr.tenantWizard.notUploaded}
        </Text>
      </View>
    </View>
  );

  const SuccessRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.successRow}>
      <Text style={styles.successRowLabel}>{label}</Text>
      <Text style={styles.successRowValue}>{value}</Text>
    </View>
  );

  const pickDocFile = async (
    setDoc: (d: DocFile) => void,
    allowPdf = true
  ) => {
    Alert.alert('Belge Seç', 'Kaynak seçin', [
      {
        text: 'Fotoğraf Çek',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('İzin gerekli', 'Kamera izni verilmedi'); return; }
          const result = await ImagePicker.launchCameraAsync({ 
            mediaTypes: ['images'],
            allowsEditing: true, 
            quality: 0.8 
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setDoc({ uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `doc-${Date.now()}.jpg` });
          }
        },
      },
      {
        text: 'Galeriden Seç',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('İzin gerekli', 'Galeri izni verilmedi'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ 
            mediaTypes: ['images'],
            allowsEditing: true, 
            quality: 0.8 
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setDoc({ uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `doc-${Date.now()}.jpg` });
          }
        },
      },
      ...(allowPdf ? [{
        text: 'PDF Seç',
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              setDoc({ uri: asset.uri, type: 'application/pdf', name: asset.name || `doc-${Date.now()}.pdf` });
            }
          } catch { Alert.alert('Hata', 'Dosya seçilemedi'); }
        },
      }] : []),
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  // ─── Validation ────────────────────────────────────────────────
  const handleNext = () => {
    if (step === 1) {
      if (!fullName.trim()) { Alert.alert(tr.common.warning, tr.tenantWizard.nameRequired); return; }
      if (!email.trim()) { Alert.alert(tr.common.warning, 'E-posta adresi zorunludur. Davet bağlantısı bu adrese gönderilecek.'); return; }
      if (!city.trim()) { Alert.alert(tr.common.warning, tr.location.provinceRequired); return; }
      if (!district.trim()) { Alert.alert(tr.common.warning, tr.location.districtRequired); return; }
      setStep(2);
    } else if (step === 2) {
      if (!monthlyRent.trim() || !rentDay.trim()) { Alert.alert(tr.common.warning, tr.tenantWizard.rentRequired); return; }
      const day = parseInt(rentDay);
      if (isNaN(day) || day < 1 || day > 28) { Alert.alert(tr.common.warning, tr.tenantWizard.invalidRentDay); return; }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  // ─── Submit ────────────────────────────────────────────────────
  const handleComplete = async () => {
    setLoading(true);
    try {
      // 1. Mevcut kullanıcıyı al
      const currentUser = await getUserData();
      if (!currentUser) {
        Alert.alert(tr.common.error, tr.errors.sessionNotFound);
        return;
      }

      const officeOwnerId = getOfficeOwnerId(currentUser);
      if (!officeOwnerId) {
        Alert.alert(tr.common.error, tr.errors.sessionNotFound);
        return;
      }

      // 2. Kiracıyı Supabase admin ile oluştur
      // Email veya telefon çözümleme
      const resolvedEmail = email.trim().includes('@')
        ? email.trim().toLowerCase()
        : `${email.trim().replace(/\D/g, '')}@emlak-user.local`;

      const resolvedPhone = email.trim().includes('@')
        ? (phone.trim() || null)
        : email.trim();

      const createUserResult = await createUser({
        email: resolvedEmail,
        password: '1234',
        role: 'tenant',
        full_name: fullName.trim(),
        phone: resolvedPhone,
        city: city.trim(),
        district: district.trim(),
        created_by: officeOwnerId,
      });
      const user_id = createUserResult.user_id;

      // 3. Mülkü güncelle — kiracıyı bağla, ödeme bilgilerini kaydet
      const rentDayNum = parseInt(rentDay);
      const duesDayNum = parseInt(duesDay) || null;
      const duesAmt = parseFloat(duesAmount) || null;
      const depositAmt = parseFloat(depositAmount) || null;

      const contractStartFormatted = contractStart || null;
      const contractEndFormatted = contractStartFormatted
        ? (() => {
            const d = new Date(contractStartFormatted);
            d.setMonth(d.getMonth() + contractDuration);
            return d.toISOString().split('T')[0];
          })()
        : null;

      const { error: propErr } = await supabase.from('properties').update({
        tenant_id: user_id,
        status: 'occupied',
        monthly_rent: parseFloat(monthlyRent),
        rent_day: rentDayNum,
        dues_amount: duesAmt,
        dues_day: duesDayNum,
        deposit_amount: depositAmt,
        contract_duration: contractDuration,
        contract_start: contractStartFormatted,
        contract_end: contractEndFormatted,
        special_terms: specialTerms.trim() || null,
      }).eq('id', propertyId);

      if (propErr) {
        // property update failed silently
      }

      // 3.5. Belgeleri yükle (isteğe bağlı — hata olursa sessiz geç)
      const docUpdates: Record<string, string> = {};
      const docList: { doc: DocFile; field: string; docType: string }[] = [
        { doc: identityDoc, field: 'identity_doc_url', docType: 'kimlik' },
        { doc: incomeDoc, field: 'income_doc_url', docType: 'gelir' },
        { doc: contractDoc, field: 'contract_doc_url', docType: 'sozlesme' },
      ];
      for (const { doc, field, docType } of docList) {
        if (!doc) continue;
        try {
          const ext = doc.name.includes('.') ? doc.name.split('.').pop() : (doc.type === 'application/pdf' ? 'pdf' : 'jpg');
          const path = `${propertyId}/${user_id}/${docType}-${Date.now()}.${ext}`;
          const { publicUrl } = await uploadFileToSupabaseStorage({
            bucket: 'tenant-documents',
            path,
            fileUri: doc.uri,
            contentType: doc.type,
          });
          docUpdates[field] = publicUrl;
        } catch {
          // doc upload failed silently
        }
      }
      if (Object.keys(docUpdates).length > 0) {
        await supabase.from('properties').update(docUpdates).eq('id', propertyId);
      }

      // 4. 12 aylık takvim etkinlikleri oluştur
      const calendarEvents: any[] = [];
      // Referans tarihi: contract_start varsa, yoksa bugün
      const refDate = contractStartFormatted ? new Date(contractStartFormatted) : new Date();
      let startYear = refDate.getFullYear();
      let startMonth = refDate.getMonth();

      // İlk ödeme ayını belirle: eğer bugün rent_day'den sonraysa, sonraki ay
      if (refDate.getDate() > rentDayNum) {
        startMonth++;
        if (startMonth > 11) {
          startMonth = 0;
          startYear++;
        }
      }

      for (let i = 0; i < 12; i++) {
        const eventDate = new Date(startYear, startMonth + i, rentDayNum);
        calendarEvents.push({
          property_id: propertyId,
          tenant_id: user_id,
          event_type: 'rent',
          event_date: eventDate.toISOString().split('T')[0],
          amount: parseFloat(monthlyRent),
          description: `Kira ödemesi — ${fullName.trim()}`,
          status: 'pending',
        });

        if (duesDayNum && duesAmt) {
          // İlk aidat ayını belirle: eğer bugün dues_day'den sonraysa, sonraki ay
          let duesStartMonth = startMonth;
          let duesStartYear = startYear;
          if (refDate.getDate() > duesDayNum && i === 0) {
            duesStartMonth++;
            if (duesStartMonth > 11) {
              duesStartMonth = 0;
              duesStartYear++;
            }
          }
          const duesDate = new Date(duesStartYear, duesStartMonth + i, duesDayNum);
          calendarEvents.push({
            property_id: propertyId,
            tenant_id: user_id,
            event_type: 'dues',
            event_date: duesDate.toISOString().split('T')[0],
            amount: duesAmt,
            description: `Aidat ödemesi — ${fullName.trim()}`,
            status: 'pending',
          });
        }

        const reminderDate = new Date(startYear, startMonth + i, rentDayNum - 5);
        if (reminderDate > new Date()) {
          calendarEvents.push({
            property_id: propertyId,
            tenant_id: user_id,
            event_type: 'reminder',
            event_date: reminderDate.toISOString().split('T')[0],
            amount: 0,
            description: `Kira ödemenize 5 gün kaldı, bilginize.`,
            status: 'pending',
          });
        }
      }

      if (calendarEvents.length > 0) {
        const { error: calErr } = await supabase.from('calendar_events').insert(calendarEvents);
        if (calErr) {
          // calendar event creation failed silently
        }
      }

      setShowSuccess(true);
    } catch {
      Alert.alert(tr.common.error, tr.errors.connectionFailed);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SUCCESS SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <View style={styles.successContainer}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.successContent}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={72} color={theme.colors.success} />
            </View>
            <Text style={styles.successTitle}>{tr.tenantWizard.successTitle}</Text>
            <Text style={styles.successMessage}>{tr.tenantWizard.successMessage}</Text>

            <View style={styles.successInvite}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.successInviteText}>
                Kullanıcı oluşturuldu.{'\n'}
                <Text style={{ fontWeight: '700' }}>{email}</Text> / Şifre: <Text style={{ fontWeight: '700' }}>1234</Text>
              </Text>
            </View>
            <View style={styles.successDetails}>
              <SuccessRow label={tr.tenantWizard.fullName} value={fullName} />
              <SuccessRow label={tr.propertyWizard.monthlyRent} value={`₺${monthlyRent}/ay`} />
            </View>

            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => router.replace(`/agent/property-detail?id=${propertyId}` as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.successBtnText}>{tr.tenantWizard.goToProperty}</Text>
              <Ionicons name="arrow-forward" size={20} color={theme.colors.textInverse} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 1 — Identity
  // ═══════════════════════════════════════════════════════════════
  const renderStep1 = () => (
    <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{tr.tenantWizard.step1Title}</Text>
          <Text style={styles.stepSubtitle}>
            {property?.description || property?.address || 'Mülk'} {tr.tenantWizard.step1Subtitle.toLowerCase()}
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{tr.tenantWizard.fullName} *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Örn: Mehmet Demir"
              placeholderTextColor={theme.colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoFocus
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{tr.tenantWizard.phone}</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="+90 555 123 4567"
              placeholderTextColor={theme.colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{tr.auth.emailOrPhone} *</Text>
            <View style={styles.fieldInputRow}>
              <Ionicons
                name={getIoniconForContactIdentifier(email)}
                size={18}
                color={theme.colors.textMuted}
                style={styles.fieldInputRowIcon}
              />
              <TextInput
                style={styles.fieldInputRowInput}
                placeholder={tr.auth.emailOrPhonePlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="default"
                autoCapitalize="none"
              />
            </View>
            <Text style={styles.fieldHint}>Kiracı bu e-posta veya telefon numarası ile giriş yapabilecek. Varsayılan şifre: 1234</Text>
            <LocationPicker
              province={city}
              district={district}
              onProvinceChange={setCity}
              onDistrictChange={setDistrict}
              required
            />
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ═══════════════════════════════════════════════════════════════
  // STEP 2 — Contract
  // ═══════════════════════════════════════════════════════════════
  const renderStep2 = () => (
    <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{tr.tenantWizard.step2Title}</Text>
          <Text style={styles.stepSubtitle}>{tr.tenantWizard.step2Subtitle}</Text>

          {/* Contract Duration */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{tr.tenantWizard.contractDuration}</Text>
            <View style={styles.durationGrid}>
              {CONTRACT_DURATIONS.map(d => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.durationChip, contractDuration === d.value && styles.durationChipSelected]}
                  onPress={() => setContractDuration(d.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.durationChipText, contractDuration === d.value && { color: theme.colors.primary }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sözleşme Başlangıç Tarihi */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Sözleşme Başlangıç Tarihi</Text>
            <TouchableOpacity 
              style={styles.fieldInput} 
              onPress={() => setIsDatePickerVisible(true)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: contractStart ? theme.colors.textPrimary : theme.colors.textMuted }}>
                  {contractStart ? contractStart.split('-').reverse().join('/') : 'Tarih Seçin'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
            <CompactDatePicker
              visible={isDatePickerVisible}
              onClose={() => setIsDatePickerVisible(false)}
              onSelect={(date) => setContractStart(date)}
              currentValue={contractStart}
              mode="date"
              title="Sözleşme Başlangıç"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{tr.propertyWizard.monthlyRent} *</Text>
            <CurrencyInput
              inputStyle={styles.fieldInput}
              placeholder="Örn: 15000"
              placeholderTextColor={theme.colors.textMuted}
              value={monthlyRent}
              onValueChange={setMonthlyRent}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.twoCol}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>{tr.tenantWizard.rentDay} *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="10"
                placeholderTextColor={theme.colors.textMuted}
                value={rentDay}
                onChangeText={setRentDay}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>{tr.tenantWizard.depositAmount}</Text>
              <CurrencyInput
                inputStyle={styles.fieldInput}
                placeholder="Örn: 30000"
                placeholderTextColor={theme.colors.textMuted}
                value={depositAmount}
                onValueChange={setDepositAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.twoCol}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>{tr.tenantWizard.duesAmount}</Text>
              <CurrencyInput
                inputStyle={styles.fieldInput}
                placeholder={tr.common.optional}
                placeholderTextColor={theme.colors.textMuted}
                value={duesAmount}
                onValueChange={setDuesAmount}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>{tr.tenantWizard.duesDay}</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder={tr.common.optional}
                placeholderTextColor={theme.colors.textMuted}
                value={duesDay}
                onChangeText={setDuesDay}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{tr.tenantWizard.specialTerms}</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder={tr.tenantWizard.specialTermsPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={specialTerms}
              onChangeText={setSpecialTerms}
              multiline
            />
          </View>

          {/* Calendar Preview */}
          {rentDay && (
            <View style={styles.previewCard}>
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>{tr.tenantWizard.calendarSummary}</Text>
                <Text style={styles.previewText}>
                  {tr.receipts.rent}: {tr.calendar.everyMonth} {rentDay} — ₺{monthlyRent || '0'}
                </Text>
                {duesDay && duesAmount && (
                  <Text style={styles.previewText}>
                    {tr.receipts.dues}: {tr.calendar.everyMonth} {duesDay} — ₺{duesAmount}
                  </Text>
                )}
                <Text style={styles.previewHint}>{tr.tenantWizard.reminderHint}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ═══════════════════════════════════════════════════════════════
  // STEP 3 — Documents
  // ═══════════════════════════════════════════════════════════════
  const renderStep3 = () => (
    <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)}>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{tr.tenantWizard.step3Title}</Text>
        <Text style={styles.stepSubtitle}>{tr.tenantWizard.step3Subtitle}</Text>

        <DocumentUploadCard
          title={tr.tenantWizard.identityDocument}
          subtitle={tr.tenantWizard.uploadHint}
          icon="id-card-outline"
          uploaded={!!identityDoc}
          fileName={identityDoc?.name}
          onPress={() => pickDocFile(setIdentityDoc)}
          onRemove={() => setIdentityDoc(null)}
        />

        <DocumentUploadCard
          title={tr.tenantWizard.incomeProof}
          subtitle={tr.tenantWizard.uploadHint}
          icon="document-text-outline"
          uploaded={!!incomeDoc}
          fileName={incomeDoc?.name}
          onPress={() => pickDocFile(setIncomeDoc)}
          onRemove={() => setIncomeDoc(null)}
        />

        <DocumentUploadCard
          title={tr.tenantWizard.contract}
          subtitle={tr.tenantWizard.uploadHint}
          icon="newspaper-outline"
          uploaded={!!contractDoc}
          fileName={contractDoc?.name}
          onPress={() => pickDocFile(setContractDoc)}
          onRemove={() => setContractDoc(null)}
        />
      </View>
    </Animated.View>
  );

  // ═══════════════════════════════════════════════════════════════
  // STEP 4 — Review & Finish
  // ═══════════════════════════════════════════════════════════════
  const renderStep4 = () => (
    <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{tr.tenantWizard.step4Title}</Text>
          <Text style={styles.stepSubtitle}>{tr.tenantWizard.step4Subtitle}</Text>

          {/* Property Info */}
          {property && (
            <View style={styles.propertyBanner}>
              <Ionicons name="business" size={22} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.propertyBannerTitle}>{property.description || property.address}</Text>
                <Text style={styles.propertyBannerSub}>{property.address}</Text>
              </View>
            </View>
          )}

          {/* Summary Card */}
          <View style={styles.reviewCard}>
            <Text style={styles.reviewCardTitle}>{tr.tenantWizard.identityTitle}</Text>
            <ReviewRow label={tr.tenantWizard.fullName} value={fullName} />
            <ReviewRow label={tr.tenantWizard.email} value={email} />
            {phone && <ReviewRow label={tr.tenantWizard.phone} value={phone} />}
          </View>

          <View style={[styles.reviewCard, { marginTop: 12 }]}>
            <Text style={styles.reviewCardTitle}>{tr.tenantWizard.contractDetailsTitle}</Text>
            <ReviewRow label={tr.tenantWizard.contractDuration} value={`${contractDuration} ${tr.tenantWizard.months}`} />
            <ReviewRow label={tr.receipts.rent} value={`₺${monthlyRent}/ay — ${tr.calendar.everyMonth} ${rentDay}`} />
            {duesAmount && duesDay && (
              <ReviewRow label={tr.receipts.dues} value={`₺${duesAmount}/ay — ${tr.calendar.everyMonth} ${duesDay}`} />
            )}
            {depositAmount && <ReviewRow label={tr.tenantWizard.depositAmount} value={`₺${depositAmount}`} />}
            {specialTerms && <ReviewRow label={tr.tenantWizard.specialTerms} value={specialTerms} />}
          </View>

          <View style={[styles.reviewCard, { marginTop: 12 }]}>
            <Text style={styles.reviewCardTitle}>{tr.tenantWizard.documentsTitle}</Text>
            <DocStatusRow label={tr.tenantWizard.identityDocument} uploaded={!!identityDoc} />
            <DocStatusRow label={tr.tenantWizard.incomeProof} uploaded={!!incomeDoc} />
            <DocStatusRow label={tr.tenantWizard.contract} uploaded={!!contractDoc} />
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr.tenantWizard.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <StepIndicator currentStep={step} totalSteps={4} labels={STEP_LABELS} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </View>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {step < 4 ? (
            <TouchableOpacity style={styles.ctaButton} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.ctaButtonText}>{tr.common.next}</Text>
              <Ionicons name="arrow-forward" size={20} color={theme.colors.textInverse} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaComplete, loading && { opacity: 0.6 }]}
              onPress={handleComplete}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <>
                  <Text style={styles.ctaButtonText}>{tr.tenantWizard.saveTenant}</Text>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.textInverse} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerBtn: { padding: 6, borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },

  stepContent: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  stepTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 },
  stepSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 28 },

  fieldGroup: { marginBottom: 22 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 8 },
  fieldInput: {
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md, paddingHorizontal: 16, paddingVertical: 18,
    fontSize: 16, color: theme.colors.textPrimary,
  },
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
  },
  fieldInputRowIcon: { marginRight: 10 },
  fieldInputRowInput: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  fieldHint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 6 },

  twoCol: { flexDirection: 'row', gap: 12 },

  generatedField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.surface2, borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  generatedText: { fontSize: 15, color: theme.colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Duration selector
  durationGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  durationChip: {
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
  },
  durationChipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  durationChipText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },

  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 8 },

  previewCard: {
    flexDirection: 'row', gap: 12, backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.lg, padding: 16, marginTop: 8,
  },
  previewTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
  previewText: { fontSize: 13, color: theme.colors.textSecondary },
  previewHint: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },

  // Document upload
  uploadCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg, padding: 18, marginBottom: 14,
  },
  uploadCardDone: { borderColor: theme.colors.success, backgroundColor: theme.colors.successLight },
  uploadIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  uploadTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  uploadSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },

  // Property banner
  propertyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.lg,
    padding: 14, marginBottom: 16,
  },
  propertyBannerTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  propertyBannerSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

  // Review card
  reviewCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: 18, borderWidth: 1, borderColor: theme.colors.border,
  },
  reviewCardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 14 },
  reviewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  reviewLabel: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  reviewValue: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, flex: 1.5, textAlign: 'right' },
  docStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },

  // Bottom bar
  bottomBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, backgroundColor: theme.colors.background },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg,
    paddingVertical: 18, ...theme.shadows.md,
  },
  ctaComplete: { backgroundColor: theme.colors.success },
  ctaButtonText: { fontSize: 17, fontWeight: '700', color: theme.colors.textInverse },

  // Success screen
  successContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  successContent: { alignItems: 'center' },
  successIconWrap: { marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  successMessage: { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  successInvite: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md,
    padding: 14, width: '100%', marginBottom: 16,
  },
  successInviteText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },

  successDetails: {
    width: '100%', backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg, padding: 18,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: 28,
  },
  successRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  successRowLabel: { fontSize: 13, color: theme.colors.textSecondary },
  successRowValue: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  successBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%',
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg,
    paddingVertical: 18, justifyContent: 'center', ...theme.shadows.md,
  },
  successBtnText: { fontSize: 17, fontWeight: '700', color: theme.colors.textInverse },
}));
