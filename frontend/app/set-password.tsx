import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { createThemedStyles, useAppTheme } from './theme';
import { supabase } from '../services/supabase';
import { buildUserDataForSession, persistUserData } from '../services/userSession';
import KeyboardAwareScrollView, {
  focusAndScrollToInput,
  scrollToInput,
} from '../components/Shared/KeyboardAwareScrollView';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const MIN_PASSWORD_LENGTH = 6;

function navigateByRole(role: string) {
  switch (role) {
    case 'agent':
      router.replace('/agent/dashboard');
      break;
    case 'landlord':
      router.replace('/landlord/dashboard');
      break;
    case 'tenant':
    default:
      router.replace('/tenant/dashboard');
      break;
  }
}

export default function SetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [focused, setFocused] = useState<'password' | 'confirm' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const theme = useAppTheme();
  const styles = useStyles();
  const scrollRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmInputRef = useRef<TextInput>(null);

  const shakeOffset = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const triggerShake = () => {
    shakeOffset.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const validate = (): string | null => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`;
    }
    if (password !== passwordConfirm) {
      return 'Şifreler eşleşmiyor.';
    }
    return null;
  };

  const handleSetPassword = async () => {
    setErrorMessage(null);

    const validationError = validate();
    if (validationError) {
      triggerShake();
      setErrorMessage(validationError);
      return;
    }

    buttonScale.value = withSequence(withSpring(0.95), withSpring(1));
    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        triggerShake();
        setErrorMessage(updateError.message || 'Şifre belirlenirken bir hata oluştu.');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        triggerShake();
        setErrorMessage('Oturum bilgisi alinamadi. Lutfen tekrar deneyin.');
        return;
      }

      const userData = await buildUserDataForSession(user.id);
      await persistUserData(userData);
      navigateByRole(userData.role);
    } catch {
      triggerShake();
      setErrorMessage('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
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
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroArea}>
          <View style={styles.iconWrap}>
            <Ionicons name="key-outline" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Şifrenizi Belirleyin</Text>
          <Text style={styles.subtitle}>
            Güvenli bir şifre belirleyerek hesabınıza erişmeye devam edin.
          </Text>
        </View>

        <Animated.View style={shakeStyle}>
          <Text style={styles.label}>Şifre</Text>
          <Pressable
            accessible={false}
            style={[styles.inputContainer, focused === 'password' && styles.inputFocused]}
            onPress={() => focusAndScrollToInput(scrollRef, passwordInputRef)}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={focused === 'password' ? theme.colors.primary : theme.colors.textMuted}
            />
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              placeholder="En az 6 karakter"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onFocus={() => {
                setFocused('password');
                scrollToInput(scrollRef, passwordInputRef, 120);
              }}
              onBlur={() => setFocused(null)}
              onSubmitEditing={() => focusAndScrollToInput(scrollRef, confirmInputRef)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((current) => !current)}
              style={styles.eyeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </Pressable>

          <Text style={styles.label}>Şifre Tekrar</Text>
          <Pressable
            accessible={false}
            style={[styles.inputContainer, focused === 'confirm' && styles.inputFocused]}
            onPress={() => focusAndScrollToInput(scrollRef, confirmInputRef)}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={focused === 'confirm' ? theme.colors.primary : theme.colors.textMuted}
            />
            <TextInput
              ref={confirmInputRef}
              style={styles.input}
              placeholder="Şifrenizi tekrar girin"
              placeholderTextColor={theme.colors.textMuted}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry={!showPasswordConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onFocus={() => {
                setFocused('confirm');
                scrollToInput(scrollRef, confirmInputRef, 120);
              }}
              onBlur={() => setFocused(null)}
              onSubmitEditing={handleSetPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPasswordConfirm((current) => !current)}
              style={styles.eyeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPasswordConfirm ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </Pressable>

          {errorMessage !== null ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.errorText} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View style={buttonAnimatedStyle}>
          <AnimatedTouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSetPassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.submitText}>Şifremi Belirle</Text>
            )}
          </AnimatedTouchableOpacity>
        </Animated.View>

        <Text style={styles.hint}>Şifreniz güvenli biçimde şifrelenerek saklanır.</Text>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.xxl,
      paddingTop: theme.spacing.xxxl,
      paddingBottom: theme.spacing.xxxl,
    },
    heroArea: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxxl,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
      ...theme.shadows.sm,
    },
    title: {
      fontSize: theme.fontSize.xxl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: theme.spacing.md,
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      marginLeft: theme.spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      minHeight: 52,
      ...theme.shadows.sm,
    },
    inputFocused: {
      borderColor: theme.colors.primary,
    },
    input: {
      flex: 1,
      paddingVertical: theme.spacing.lg,
      fontSize: theme.fontSize.base,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.medium,
    },
    eyeButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.errorLight,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    errorText: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: theme.colors.errorText,
      fontWeight: theme.fontWeight.medium,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
      minHeight: 52,
      ...theme.shadows.md,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitText: {
      color: theme.colors.textInverse,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.bold,
      letterSpacing: 0.5,
    },
    hint: {
      marginTop: theme.spacing.xl,
      fontSize: theme.fontSize.xs,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
  })
);
