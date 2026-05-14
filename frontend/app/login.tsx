import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { brand, getPublicSurface } from '../constants/brand';
import { createThemedStyles, useAppTheme } from './theme';
import { tr } from './translations';
import { resolveLoginIdentifier } from '../services/appApi';
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigurationErrorMessage,
} from '../services/supabase';
import { buildUserDataForSession, persistUserData } from '../services/userSession';
import type { UserData } from '../services/userSession';
import { getIoniconForContactIdentifier } from '../utils/contactIdentifier';
import KeyboardAwareScrollView, {
  focusAndScrollToInput,
  scrollToInput,
} from '../components/Shared/KeyboardAwareScrollView';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const theme = useAppTheme();
  const styles = useStyles();
  const scrollRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const clearError = () => {
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const showError = (message: string) => {
    setErrorMessage(message);
  };

  const navigateBasedOnRole = (userData: UserData) => {
    if (userData.status !== 'pending' && !userData.terms_accepted_at) {
      router.replace('/legal-acceptance' as never);
      return;
    }

    const role = userData.role;
    switch (role) {
      case 'admin':
        router.replace('/admin/dashboard');
        break;
      case 'agent':
      case 'employee':
        router.replace('/agent/dashboard');
        break;
      case 'landlord':
        router.replace('/landlord/dashboard');
        break;
      case 'tenant':
        router.replace('/tenant/dashboard');
        break;
      default:
        Alert.alert(tr.common.error, 'Geçersiz kullanıcı rolü');
    }
  };

  const handleLogin = async () => {
    if (!isSupabaseConfigured) {
      showError(supabaseConfigurationErrorMessage || 'Supabase ayarları eksik.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      showError(tr.auth.fillRequired);
      return;
    }

    clearError();
    setLoading(true);

    try {
      let resolvedEmail = email.trim();

      if (!resolvedEmail.includes('@')) {
        try {
          const response = await resolveLoginIdentifier(resolvedEmail);
          resolvedEmail = response.email;
        } catch {
          showError(tr.auth.phoneNotFound);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: resolvedEmail.toLowerCase(),
        password: password.trim(),
      });

      if (error || !data.user) {
        showError(tr.auth.wrongCredentials);
        return;
      }

      const userData = await buildUserDataForSession(data.user.id).catch(() => null);

      if (!userData) {
        showError(tr.auth.wrongCredentials);
        return;
      }

      await persistUserData(userData);
      navigateBasedOnRole(userData);
    } catch {
      showError(tr.auth.wrongCredentials);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      <KeyboardAwareScrollView
        scrollRef={scrollRef}
        containerStyle={styles.keyboardView}
      >
        <View style={styles.contentContainer}>
          <Animated.View entering={FadeInDown.duration(420)} style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{brand.loginEyebrow}</Text>
            </View>
            <BrandLockup size="section" variant="logo" align="left" />
            <Text style={styles.heroTitle}>{brand.loginTitle}</Text>
            <Text style={styles.heroSubtitle}>{brand.loginSubtitle}</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(70).duration(420)} style={styles.formCard}>
            <Text style={styles.formTitle}>{tr.auth.signIn}</Text>
            <Text style={styles.formSubtitle}>{brand.loginHelper}</Text>

            {!isSupabaseConfigured && supabaseConfigurationErrorMessage ? (
              <View style={styles.warningCard}>
                <Ionicons name="warning-outline" size={18} color={theme.colors.warningText} />
                <Text style={styles.warningText}>{supabaseConfigurationErrorMessage}</Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorCard} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>E-posta veya telefon</Text>
              <Pressable
                accessible={false}
                style={[
                  styles.inputContainer,
                  focused === 'email' ? styles.inputFocused : null,
                ]}
                onPress={() => focusAndScrollToInput(scrollRef, emailInputRef, 120)}
              >
                <Ionicons
                  name={getIoniconForContactIdentifier(email)}
                  size={20}
                  color={focused === 'email' ? theme.colors.primary : theme.colors.textMuted}
                />
                <TextInput
                  ref={emailInputRef}
                  style={styles.input}
                  placeholder={tr.auth.emailOrPhonePlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    clearError();
                  }}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  autoComplete="username"
                  returnKeyType="next"
                  onFocus={() => {
                    setFocused('email');
                    scrollToInput(scrollRef, emailInputRef, 120);
                  }}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={() => focusAndScrollToInput(scrollRef, passwordInputRef, 220)}
                  accessibilityLabel="E-posta veya telefon giriş alanı"
                />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{tr.auth.password}</Text>
              <Pressable
                accessible={false}
                style={[
                  styles.inputContainer,
                  focused === 'password' ? styles.inputFocused : null,
                ]}
                onPress={() => focusAndScrollToInput(scrollRef, passwordInputRef, 220)}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focused === 'password' ? theme.colors.primary : theme.colors.textMuted}
                />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder={tr.auth.password}
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearError();
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="done"
                  onFocus={() => {
                    setFocused('password');
                    scrollToInput(scrollRef, passwordInputRef, 220);
                  }}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={handleLogin}
                  accessibilityLabel="Şifre giriş alanı"
                />
              </Pressable>
            </View>

            <TouchableOpacity
              onPress={() => router.push(`/forgot-password?identifier=${encodeURIComponent(email.trim())}` as never)}
              style={styles.forgotButton}
              activeOpacity={0.78}
              accessibilityRole="button"
            >
              <Text style={styles.forgotButtonText}>Şifremi unuttum</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, (loading || !email.trim() || !password.trim()) ? styles.submitButtonDisabled : null]}
              onPress={handleLogin}
              disabled={loading || !email.trim() || !password.trim()}
              activeOpacity={0.88}
              accessibilityLabel={tr.auth.signIn}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <>
                  <Text style={styles.submitText}>{tr.auth.signIn}</Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.colors.textInverse} />
                </>
              )}
            </TouchableOpacity>

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

            <Text style={styles.footnote}>{brand.tagline}</Text>
          </Animated.View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) => {
  const publicSurface = getPublicSurface(theme);
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: 999,
      backgroundColor: publicSurface.chipBg,
    },
    backButtonText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.semibold,
    },
    keyboardView: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
      gap: 35,
    },
    heroCard: {
      position: 'relative',
      backgroundColor: publicSurface.heroPanel,
      borderRadius: theme.borderRadius.xl + 8,
      borderWidth: 1,
      borderColor: publicSurface.panelBorder,
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    heroGlow: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: publicSurface.heroTint,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      backgroundColor: publicSurface.chipBg,
      borderRadius: 999,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    heroBadgeText: {
      fontSize: theme.fontSize.sm,
      color: publicSurface.chipText,
      fontWeight: theme.fontWeight.semibold,
    },
    heroTitle: {
      fontSize: 26,
      lineHeight: 33,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.bold,
      maxWidth: 320,
    },
    heroSubtitle: {
      fontSize: theme.fontSize.base,
      lineHeight: 23,
      color: theme.colors.textSecondary,
      maxWidth: 320,
    },
    formCard: {
      backgroundColor: publicSurface.panel,
      borderRadius: theme.borderRadius.xl + 8,
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
    formSubtitle: {
      fontSize: theme.fontSize.sm,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
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
    fieldGroup: {
      gap: theme.spacing.lg,
    },
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
    inputFocused: {
      borderColor: publicSurface.fieldFocus,
      backgroundColor: theme.colors.surface,
    },
    input: {
      flex: 1,
      minHeight: 60,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.medium,
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
    submitButtonDisabled: {
      opacity: 0.72,
    },
    forgotButton: {
      alignSelf: 'flex-end',
      marginTop: -theme.spacing.sm,
      minHeight: 36,
      justifyContent: 'center',
    },
    forgotButtonText: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
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
  });
});
