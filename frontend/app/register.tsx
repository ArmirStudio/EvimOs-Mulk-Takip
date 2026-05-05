import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import BrandLockup from '../components/Shared/BrandLockup';
import KeyboardAwareScrollView, {
  focusAndScrollToInput,
  scrollToInput,
} from '../components/Shared/KeyboardAwareScrollView';
import { publicSurface } from '../constants/brand';
import {
  lookupPublicInviteCode,
  registerPublicInviteCode,
  type PublicInvitePayload,
} from '../services/appApi';
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigurationErrorMessage,
} from '../services/supabase';
import { buildUserDataForSession, persistUserData } from '../services/userSession';
import { normalizeInviteCode, normalizeTurkishPhone } from '../utils/phone';
import { createThemedStyles, useAppTheme } from './theme';

type FocusedField = 'code' | 'full_name' | 'phone' | 'email' | 'password' | null;

export default function RegisterScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const scrollRef = useRef<ScrollView>(null);
  const codeRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [invite, setInvite] = useState<PublicInvitePayload | null>(null);
  const [focused, setFocused] = useState<FocusedField>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '' });

  const normalizedCode = normalizeInviteCode(code);
  const canLookup = normalizedCode.length === 8 && !checking;
  const canSubmit =
    !!invite &&
    form.full_name.trim().length > 1 &&
    form.email.trim().includes('@') &&
    form.password.trim().length >= 8 &&
    !submitting;

  const showMessage = (next: string) => setMessage(next);
  const clearMessage = () => {
    if (message) setMessage('');
  };

  const handleLookup = async () => {
    if (!canLookup || !isSupabaseConfigured) {
      if (!isSupabaseConfigured) {
        showMessage(supabaseConfigurationErrorMessage || 'Supabase ayarları eksik.');
      }
      return;
    }
    setChecking(true);
    clearMessage();
    try {
      const result = await lookupPublicInviteCode(normalizedCode);
      setInvite(result);
      setForm((prev) => ({
        ...prev,
        full_name: prev.full_name || result.prefill_full_name || '',
        phone: prev.phone || result.prefill_phone || '',
        email: prev.email || result.prefill_email || '',
      }));
    } catch (error: any) {
      setInvite(null);
      showMessage(error?.detail || error?.message || 'Davet kodu geçersiz veya süresi dolmuş.');
    } finally {
      setChecking(false);
    }
  };

  const handleRegister = async () => {
    if (!canSubmit || !invite) return;
    setSubmitting(true);
    clearMessage();
    try {
      await registerPublicInviteCode(normalizedCode, {
        full_name: form.full_name.trim(),
        phone: normalizeTurkishPhone(form.phone) || null,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (error || !data.user) {
        router.replace('/login' as never);
        return;
      }
      const userData = await buildUserDataForSession(data.user.id);
      await persistUserData(userData);
      router.replace(userData.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard');
    } catch (error: any) {
      showMessage(error?.detail || error?.message || 'Kayıt tamamlanamadı. Bilgileri kontrol edin.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (field: FocusedField) => [
    styles.inputContainer,
    focused === field ? styles.inputFocused : null,
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <KeyboardAwareScrollView
        scrollRef={scrollRef}
        containerStyle={styles.keyboardView}
        contentContainerStyle={styles.contentContainer}
      >
        <Animated.View entering={FadeInDown.duration(420)} style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Davetli kayıt</Text>
          </View>
          <BrandLockup size="section" variant="logo" align="left" />
          <Text style={styles.heroTitle}>Emlak ofisinizin verdiği davet koduyla kaydolun.</Text>
          <Text style={styles.heroSubtitle}>
            Kod doğrulandıktan sonra rolünüz ve ofisiniz otomatik belirlenir. Hesap, emlakçı onayından sonra açılır.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(70).duration(420)} style={styles.formCard}>
          <Text style={styles.formTitle}>Kayıt Ol</Text>
          <Text style={styles.formSubtitle}>Davet kodunuz yoksa emlak ofisinizden yeni davet isteyin.</Text>

          {!isSupabaseConfigured && supabaseConfigurationErrorMessage ? (
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={18} color={theme.colors.warningText} />
              <Text style={styles.warningText}>{supabaseConfigurationErrorMessage}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={styles.errorCard} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
              <Text style={styles.errorText}>{message}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Davet kodu</Text>
            <Pressable
              accessible={false}
              style={inputStyle('code')}
              onPress={() => focusAndScrollToInput(scrollRef, codeRef, 120)}
            >
              <Ionicons
                name="key-outline"
                size={20}
                color={focused === 'code' ? theme.colors.primary : theme.colors.textMuted}
              />
              <TextInput
                ref={codeRef}
                style={styles.input}
                placeholder="Örn: K7M2P9QA"
                placeholderTextColor={theme.colors.textMuted}
                value={code}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                onChangeText={(value) => {
                  setCode(normalizeInviteCode(value));
                  setInvite(null);
                  clearMessage();
                }}
                onFocus={() => {
                  setFocused('code');
                  scrollToInput(scrollRef, codeRef, 120);
                }}
                onBlur={() => setFocused(null)}
                onSubmitEditing={handleLookup}
              />
            </Pressable>
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, !canLookup ? styles.buttonDisabled : null]}
            onPress={handleLookup}
            disabled={!canLookup}
            activeOpacity={0.88}
          >
            {checking ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <>
                <Text style={styles.secondaryButtonText}>Kodu Doğrula</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.primary} />
              </>
            )}
          </TouchableOpacity>

          {invite ? (
            <View style={styles.inviteSummary}>
              <Text style={styles.inviteSummaryTitle}>{invite.office_name}</Text>
              <Text style={styles.inviteSummaryText}>
                {invite.role === 'landlord' ? 'Ev sahibi' : 'Kiracı'} daveti bulundu. Aşağıdaki bilgileri kendi gerçek bilgilerinizle tamamlayın.
              </Text>
            </View>
          ) : null}

          {invite ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Ad Soyad</Text>
                <Pressable accessible={false} style={inputStyle('full_name')} onPress={() => focusAndScrollToInput(scrollRef, nameRef, 180)}>
                  <Ionicons name="person-outline" size={20} color={focused === 'full_name' ? theme.colors.primary : theme.colors.textMuted} />
                  <TextInput
                    ref={nameRef}
                    style={styles.input}
                    placeholder="Ad Soyad"
                    placeholderTextColor={theme.colors.textMuted}
                    value={form.full_name}
                    onChangeText={(full_name) => setForm((prev) => ({ ...prev, full_name }))}
                    onFocus={() => {
                      setFocused('full_name');
                      scrollToInput(scrollRef, nameRef, 180);
                    }}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={() => focusAndScrollToInput(scrollRef, phoneRef, 220)}
                  />
                </Pressable>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Telefon</Text>
                <Pressable accessible={false} style={inputStyle('phone')} onPress={() => focusAndScrollToInput(scrollRef, phoneRef, 220)}>
                  <Ionicons name="call-outline" size={20} color={focused === 'phone' ? theme.colors.primary : theme.colors.textMuted} />
                  <TextInput
                    ref={phoneRef}
                    style={styles.input}
                    placeholder="+905321234567"
                    placeholderTextColor={theme.colors.textMuted}
                    value={form.phone}
                    keyboardType="phone-pad"
                    onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))}
                    onFocus={() => {
                      setFocused('phone');
                      scrollToInput(scrollRef, phoneRef, 220);
                    }}
                    onBlur={() => {
                      setFocused(null);
                      setForm((prev) => ({ ...prev, phone: normalizeTurkishPhone(prev.phone) }));
                    }}
                    onSubmitEditing={() => focusAndScrollToInput(scrollRef, emailRef, 260)}
                  />
                </Pressable>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>E-posta</Text>
                <Pressable accessible={false} style={inputStyle('email')} onPress={() => focusAndScrollToInput(scrollRef, emailRef, 260)}>
                  <Ionicons name="mail-outline" size={20} color={focused === 'email' ? theme.colors.primary : theme.colors.textMuted} />
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="ornek@eposta.com"
                    placeholderTextColor={theme.colors.textMuted}
                    value={form.email}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
                    onFocus={() => {
                      setFocused('email');
                      scrollToInput(scrollRef, emailRef, 260);
                    }}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={() => focusAndScrollToInput(scrollRef, passwordRef, 300)}
                  />
                </Pressable>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Şifre</Text>
                <Pressable accessible={false} style={inputStyle('password')} onPress={() => focusAndScrollToInput(scrollRef, passwordRef, 300)}>
                  <Ionicons name="lock-closed-outline" size={20} color={focused === 'password' ? theme.colors.primary : theme.colors.textMuted} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Min. 8 karakter"
                    placeholderTextColor={theme.colors.textMuted}
                    value={form.password}
                    secureTextEntry
                    autoCapitalize="none"
                    onChangeText={(password) => setForm((prev) => ({ ...prev, password }))}
                    onFocus={() => {
                      setFocused('password');
                      scrollToInput(scrollRef, passwordRef, 300);
                    }}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={handleRegister}
                  />
                </Pressable>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, !canSubmit ? styles.buttonDisabled : null]}
                onPress={handleRegister}
                disabled={!canSubmit}
                activeOpacity={0.88}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.textInverse} />
                ) : (
                  <>
                    <Text style={styles.submitText}>Kayıt Ol</Text>
                    <Ionicons name="arrow-forward" size={18} color={theme.colors.textInverse} />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity
            onPress={() => router.replace('/')}
            style={styles.backButton}
            activeOpacity={0.82}
            accessibilityLabel="Açılış ekranına dön"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={18} color={theme.colors.primary} />
            <Text style={styles.backButtonText}>Açılışa dön</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login' as never)} activeOpacity={0.75}>
            <Text style={styles.footnote}>Zaten hesabınız varsa giriş yapın.</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    keyboardView: { flex: 1 },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
      gap: 35,
    },
    backButton: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.round,
      backgroundColor: publicSurface.chipBg,
    },
    backButtonText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.semibold,
    },
    heroCard: {
      position: 'relative',
      backgroundColor: publicSurface.heroPanel,
      borderRadius: theme.borderRadius.xl + theme.spacing.sm,
      borderWidth: 1,
      borderColor: publicSurface.panelBorder,
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    heroGlow: {
      position: 'absolute',
      top: -theme.spacing.xxxl,
      right: -theme.spacing.xxxl,
      width: 160,
      height: 160,
      borderRadius: theme.borderRadius.round * 2,
      backgroundColor: publicSurface.heroTint,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      backgroundColor: publicSurface.chipBg,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    heroBadgeText: {
      fontSize: theme.fontSize.sm,
      color: publicSurface.chipText,
      fontWeight: theme.fontWeight.semibold,
    },
    heroTitle: {
      fontSize: theme.fontSize.xxl,
      lineHeight: 32,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.bold,
      maxWidth: 340,
    },
    heroSubtitle: {
      fontSize: theme.fontSize.base,
      lineHeight: 23,
      color: theme.colors.textSecondary,
      maxWidth: 340,
    },
    formCard: {
      backgroundColor: publicSurface.panel,
      borderRadius: theme.borderRadius.xl + theme.spacing.sm,
      borderWidth: 1,
      borderColor: publicSurface.panelBorder,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
      ...theme.shadows.md,
    },
    formTitle: {
      fontSize: theme.fontSize.xxl,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.bold,
    },
    formSubtitle: { fontSize: theme.fontSize.sm, lineHeight: 20, color: theme.colors.textSecondary },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.warningLight,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
    },
    warningText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      lineHeight: 18,
      color: theme.colors.warningText,
      fontWeight: theme.fontWeight.medium,
    },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      backgroundColor: publicSurface.fieldDangerBg,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: publicSurface.fieldDangerBorder,
      padding: theme.spacing.md,
    },
    errorText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      lineHeight: 18,
      color: theme.colors.errorText,
      fontWeight: theme.fontWeight.medium,
    },
    inviteSummary: {
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
      backgroundColor: theme.colors.primaryLight,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    inviteSummaryTitle: {
      fontSize: theme.fontSize.base,
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.bold,
    },
    inviteSummaryText: { fontSize: theme.fontSize.sm, lineHeight: 19, color: theme.colors.textSecondary },
    fieldGroup: { gap: theme.spacing.lg },
    fieldLabel: {
      fontSize: theme.fontSize.sm,
      color: publicSurface.warmText,
      fontWeight: theme.fontWeight.semibold,
    },
    inputContainer: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: publicSurface.fieldBorder,
      backgroundColor: publicSurface.fieldBg,
      paddingHorizontal: theme.spacing.lg,
    },
    inputFocused: { borderColor: publicSurface.fieldFocus, backgroundColor: theme.colors.surface },
    input: {
      flex: 1,
      minHeight: 60,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.medium,
    },
    secondaryButton: {
      minHeight: 52,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.bold,
    },
    submitButton: {
      minHeight: 56,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xxl,
      ...theme.shadows.md,
    },
    buttonDisabled: { opacity: 0.62 },
    submitText: {
      color: theme.colors.textInverse,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.bold,
      letterSpacing: 0.2,
    },
    footnote: {
      fontSize: theme.fontSize.sm,
      lineHeight: 19,
      color: publicSurface.warmText,
      textAlign: 'center',
      fontWeight: theme.fontWeight.medium,
    },
  }),
);
