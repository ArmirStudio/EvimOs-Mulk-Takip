import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Pressable, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { createThemedStyles, useAppTheme } from '../theme';
import { tr } from '../translations';
import { createUser } from '../../services/appApi';
import { getUserData } from '../../hooks/useUserData';
import { getIoniconForContactIdentifier } from '../../utils/contactIdentifier';
import KeyboardAwareScrollView, {
  focusAndScrollToInput,
  scrollToInput,
} from '../../components/Shared/KeyboardAwareScrollView';
import LocationPicker from '../../components/Shared/LocationPicker';
import { canManageOfficeRecords, getOfficeOwnerId } from '../../utils/employeeAccess';

export default function CreateUserScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const typeParam = Array.isArray(params.type) ? params.type[0] : params.type;
  const userType = typeParam || 'landlord';
  const isLandlord = userType === 'landlord';

  const accentColor = isLandlord ? theme.colors.copper : theme.colors.primary;
  const accentLight = isLandlord ? theme.colors.copperLight : theme.colors.primaryLight;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fullNameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = await getUserData();
      if (!currentUser) {
        router.replace('/' as any);
        return;
      }
      if (!canManageOfficeRecords(currentUser)) {
        Alert.alert(tr.common.warning, 'Bu işlem için tam yetkili çalışan veya emlakçı hesabı gerekir.');
        router.replace('/agent/dashboard' as any);
      }
    };
    checkAccess();
  }, []);

  const getTitle = () => isLandlord ? tr.users.addLandlord : tr.users.addTenant;
  const getUserTypeLabel = () => isLandlord ? tr.users.landlord : tr.users.tenant;

  const handleNext = () => {
    if (step === 1) {
      if (!fullName.trim()) {
        Alert.alert(tr.common.error, tr.users.fullNamePlaceholder);
        return;
      }
      if (!city.trim()) {
        Alert.alert(tr.common.error, tr.location.provinceRequired);
        return;
      }
      if (!district.trim()) {
        Alert.alert(tr.common.error, tr.location.districtRequired);
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert(tr.common.error, tr.users.fillAllFields);
      return;
    }

    setLoading(true);
    try {
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

      const resolvedEmail = email.trim().includes('@')
        ? email.trim().toLowerCase()
        : `${email.trim().replace(/\D/g, '')}@emlak-user.local`;

      const resolvedPhone = email.trim().includes('@')
        ? (phone.trim() || null)
        : email.trim();

      await createUser({
        email: resolvedEmail,
        password: '1234',
        role: userType,
        full_name: fullName.trim(),
        phone: resolvedPhone,
        city: city.trim(),
        district: district.trim(),
        created_by: officeOwnerId,
      });

      setShowSuccess(true);
    } catch {
      Alert.alert(tr.common.error, tr.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <View style={styles.successContainer}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.successContent}>
            <View style={[styles.successIconCircle, { backgroundColor: accentLight }]}>
              <Ionicons name="checkmark-circle" size={64} color={accentColor} />
            </View>
            <Text style={styles.successTitle}>{tr.common.success}</Text>
            <Text style={styles.successMessage}>
              {tr.users.userCreatedSuccess.replace('{type}', getUserTypeLabel())}
            </Text>

            <View style={[styles.inviteNotice, { backgroundColor: accentLight, borderColor: accentColor }]}>
              <MaterialIcons name="vpn-key" size={18} color={accentColor} />
              <Text style={styles.inviteNoticeText}>
                {tr.users.userCreated}{'\n'}
                <Text style={{ fontWeight: '700' }}>{email}</Text>
                {' '}/ {tr.users.password}:{' '}
                <Text style={{ fontWeight: '700' }}>1234</Text>
              </Text>
            </View>

            <View style={styles.successDetails}>
              <View style={styles.successRow}>
                <Text style={styles.successRowLabel}>{tr.users.fullName}</Text>
                <Text style={styles.successRowValue}>{fullName}</Text>
              </View>
              <View style={[styles.successRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.successRowLabel}>{tr.auth.email}</Text>
                <Text style={[styles.successRowValue, styles.monoText]}>{email}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.successBtn, { backgroundColor: accentColor }]}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
              activeOpacity={0.85}
            >
              <Text style={styles.successBtnText}>{tr.common.ok}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <Animated.View
      entering={FadeInRight.duration(280)}
      exiting={FadeOutLeft.duration(200)}
      style={styles.stepView}
    >
      <View style={styles.formCard}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{tr.users.fullName} *</Text>
          <TextInput
            ref={fullNameInputRef}
            style={[styles.fieldInput, focused === 'fullName' && { borderColor: accentColor, borderWidth: 1.5 }]}
            placeholder={tr.users.fullNamePlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
            onFocus={() => { setFocused('fullName'); scrollToInput(scrollRef, fullNameInputRef, 120); }}
            onBlur={() => setFocused(null)}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => phoneInputRef.current?.focus()}
          />
        </View>

        <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
          <Text style={styles.fieldLabel}>{tr.users.phone}</Text>
          <TextInput
            ref={phoneInputRef}
            style={[styles.fieldInput, focused === 'phone' && { borderColor: accentColor, borderWidth: 1.5 }]}
            placeholder="+90 5XX XXX XX XX"
            placeholderTextColor={theme.colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            onFocus={() => { setFocused('phone'); scrollToInput(scrollRef, phoneInputRef, 120); }}
            onBlur={() => setFocused(null)}
            returnKeyType="done"
          />
        </View>
      </View>

      <View style={styles.formCard}>
        <LocationPicker
          province={city}
          district={district}
          onProvinceChange={setCity}
          onDistrictChange={setDistrict}
          required
        />
      </View>
    </Animated.View>
  );

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <Animated.View
      entering={FadeInRight.duration(280)}
      exiting={FadeOutLeft.duration(200)}
      style={styles.stepView}
    >
      <View style={styles.formCard}>
        <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
          <Text style={styles.fieldLabel}>{tr.auth.emailOrPhone} *</Text>
          <Pressable
            accessible={false}
            style={[
              styles.inputContainer,
              focused === 'email' && { borderColor: accentColor, borderWidth: 1.5 },
            ]}
            onPress={() => focusAndScrollToInput(scrollRef, emailInputRef)}
          >
            <View style={styles.inputWithIcon}>
              <Ionicons
                name={getIoniconForContactIdentifier(email)}
                size={18}
                color={focused === 'email' ? accentColor : theme.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                ref={emailInputRef}
                style={styles.fieldInputNoBorder}
                placeholder={tr.auth.emailOrPhonePlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="default"
                autoCapitalize="none"
                returnKeyType="done"
                onFocus={() => { setFocused('email'); scrollToInput(scrollRef, emailInputRef, 120); }}
                onBlur={() => setFocused(null)}
                onSubmitEditing={handleCreate}
              />
            </View>
          </Pressable>
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={14} color={theme.colors.textMuted} />
            <Text style={styles.fieldHint}>{tr.users.passwordHint || 'Varsayılan şifre: 1234'}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  // ── Hero section ─────────────────────────────────────────────────────────
  const heroIcon = isLandlord ? 'person-add' : 'group-add';
  const stepTitles = [tr.tenantWizard.step1Title, tr.tenantWizard.step4Title];
  const stepSubtitles = [tr.tenantWizard.step1Subtitle, tr.auth.secureAccess];

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.typePill, { backgroundColor: accentLight, borderColor: accentColor }]}>
          <MaterialIcons name={heroIcon} size={14} color={accentColor} />
          <Text style={[styles.typePillText, { color: accentColor }]}>{getTitle()}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Step progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${(step / 2) * 100}%`, backgroundColor: accentColor },
          ]}
        />
      </View>

      {/* Hero band */}
      <View style={[styles.heroBand, { backgroundColor: accentLight }]}>
        <View style={[styles.heroIconCircle, { backgroundColor: accentColor }]}>
          <MaterialIcons name={heroIcon} size={26} color={theme.colors.textInverse} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>{stepTitles[step - 1]}</Text>
          <Text style={styles.heroSubtitle}>{stepSubtitles[step - 1]}</Text>
        </View>
        <View style={styles.stepBadge}>
          <Text style={[styles.stepBadgeText, { color: accentColor }]}>{step} / 2</Text>
        </View>
      </View>

      {/* Form */}
      <KeyboardAwareScrollView
        scrollRef={scrollRef}
        containerStyle={styles.keyboardView}
        contentContainerStyle={styles.scrollContent}
      >
        {step === 1 ? renderStep1() : renderStep2()}
      </KeyboardAwareScrollView>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {step === 1 ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: accentColor }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>{tr.common.next}</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.textInverse} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: accentColor }, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <>
                <Text style={styles.actionButtonText}>{tr.common.submit}</Text>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.textInverse} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    headerBtn: { padding: 6, borderRadius: 8 },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
    },
    typePillText: { fontSize: 13, fontWeight: '700' },

    // Progress bar
    progressTrack: {
      height: 3,
      backgroundColor: theme.colors.border,
      marginHorizontal: 16,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 0,
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },

    // Hero band
    heroBand: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: theme.borderRadius.xl,
      gap: 12,
    },
    heroIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroText: { flex: 1 },
    heroTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    heroSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    stepBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
    },
    stepBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },

    // Scroll
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingTop: 12, paddingBottom: 32 },
    stepView: { flex: 1, paddingHorizontal: 16, gap: 12 },

    // Form cards
    formCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    fieldGroup: { marginBottom: 16 },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    fieldInput: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    fieldInputNoBorder: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    inputContainer: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 14,
    },
    inputWithIcon: { flexDirection: 'row', alignItems: 'center' },
    inputIcon: { marginRight: 8 },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
    },
    fieldHint: { fontSize: 12, color: theme.colors.textMuted },

    // Bottom bar
    bottomBar: {
      padding: 16,
      paddingBottom: 16,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: 16,
      ...theme.shadows.md,
    },
    buttonDisabled: { opacity: 0.55 },
    actionButtonText: { color: theme.colors.textInverse, fontSize: 16, fontWeight: '700' },

    // Success
    successContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
    successContent: { alignItems: 'center', width: '100%' },
    successIconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    successTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
    },
    successMessage: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    inviteNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      padding: 14,
      width: '100%',
      marginBottom: 16,
    },
    inviteNoticeText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
    successDetails: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 28,
      ...theme.shadows.sm,
    },
    successRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    successRowLabel: { fontSize: 13, color: theme.colors.textSecondary },
    successRowValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      textAlign: 'right',
      flex: 1,
      marginLeft: 16,
    },
    monoText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      color: theme.colors.primary,
    },
    successBtn: {
      width: '100%',
      borderRadius: theme.borderRadius.lg,
      paddingVertical: 16,
      alignItems: 'center',
      ...theme.shadows.md,
    },
    successBtnText: { color: theme.colors.textInverse, fontSize: 17, fontWeight: '700' },
  })
);
