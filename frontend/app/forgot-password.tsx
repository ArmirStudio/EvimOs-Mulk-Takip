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
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { createThemedStyles, useAppTheme } from './theme';
import { resolveLoginIdentifier } from '../services/appApi';
import { isSupabaseConfigured, supabase, supabaseConfigurationErrorMessage } from '../services/supabase';
import KeyboardAwareScrollView, { focusAndScrollToInput, scrollToInput } from '../components/Shared/KeyboardAwareScrollView';
import { getIoniconForContactIdentifier } from '../utils/contactIdentifier';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ identifier?: string }>();
  const [identifier, setIdentifier] = useState(params.identifier || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const theme = useAppTheme();
  const styles = useStyles();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const handleReset = async () => {
    if (!isSupabaseConfigured) {
      setMessage(supabaseConfigurationErrorMessage || 'Supabase ayarları eksik.');
      return;
    }
    if (!identifier.trim()) {
      setMessage('E-posta veya telefon girin.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      let email = identifier.trim();
      if (!email.includes('@')) {
        const resolved = await resolveLoginIdentifier(email);
        email = resolved.email;
      }

      const redirectTo = Linking.createURL('auth/callback');
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), { redirectTo });
      if (error) throw error;
      Alert.alert('Bağlantı gönderildi', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.', [
        { text: 'Tamam', onPress: () => router.replace('/login' as never) },
      ]);
    } catch (error: any) {
      setMessage(error?.detail || error?.message || 'Şifre sıfırlama bağlantısı gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} translucent />
      <KeyboardAwareScrollView scrollRef={scrollRef} containerStyle={styles.keyboardView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Ionicons name="key-outline" size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Şifremi unuttum</Text>
            <Text style={styles.subtitle}>
              Hesabınıza bağlı e-posta veya telefon numarasını girin. Size şifre sıfırlama bağlantısı göndereceğiz.
            </Text>
          </View>

          {message ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
              <Text style={styles.errorText}>{message}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>E-posta veya telefon</Text>
            <Pressable style={styles.inputContainer} onPress={() => focusAndScrollToInput(scrollRef, inputRef, 120)}>
              <Ionicons name={getIoniconForContactIdentifier(identifier)} size={20} color={theme.colors.textMuted} />
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={identifier}
                onChangeText={(value) => {
                  setIdentifier(value);
                  setMessage('');
                }}
                placeholder="E-posta veya telefon"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                onFocus={() => scrollToInput(scrollRef, inputRef, 120)}
                onSubmitEditing={handleReset}
              />
            </Pressable>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabled]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.primaryText}>Sıfırlama bağlantısı gönder</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/login' as never)}>
            <Ionicons name="arrow-back" size={18} color={theme.colors.primary} />
            <Text style={styles.secondaryText}>Girişe dön</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    keyboardView: { flex: 1 },
    content: { flexGrow: 1, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg },
    header: { gap: theme.spacing.sm },
    iconBox: {
      width: 56,
      height: 56,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    subtitle: { fontSize: theme.fontSize.base, lineHeight: 22, color: theme.colors.textSecondary },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.errorLight,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    errorText: { flex: 1, color: theme.colors.errorText, fontSize: theme.fontSize.sm, lineHeight: 19 },
    fieldGroup: { gap: theme.spacing.sm },
    label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: theme.fontWeight.semibold },
    inputContainer: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    input: { flex: 1, minHeight: 58, fontSize: theme.fontSize.base, color: theme.colors.textPrimary },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    primaryText: { color: theme.colors.textInverse, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.base },
    secondaryButton: {
      alignSelf: 'center',
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    secondaryText: { color: theme.colors.primary, fontWeight: theme.fontWeight.semibold, fontSize: theme.fontSize.sm },
    disabled: { opacity: 0.6 },
  })
);
