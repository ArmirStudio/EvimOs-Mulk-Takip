import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { createThemedStyles, useAppTheme } from '../theme';
import {
  getPublicInvite,
  lookupPublicInviteCode,
  registerPublicInvite,
  registerPublicInviteCode,
} from '../../services/appApi';
import { isSupabaseConfigured, supabase } from '../../services/supabase';
import { buildUserDataForSession, persistUserData } from '../../services/userSession';
import { normalizeInviteCode, normalizeTurkishPhone } from '../../utils/phone';

type InviteSource = { kind: 'token' | 'code'; value: string };

export default function InviteRegisterScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const theme = useAppTheme();
  const styles = useStyles();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState('');
  const [fallbackCode, setFallbackCode] = useState('');
  const [inviteSource, setInviteSource] = useState<InviteSource | null>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '' });

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const result = await getPublicInvite(token);
        setInvite(result);
        setInviteSource({ kind: 'token', value: token });
        setForm((prev) => ({
          ...prev,
          full_name: prev.full_name || result.prefill_full_name || '',
          phone: prev.phone || result.prefill_phone || '',
          email: prev.email || result.prefill_email || '',
        }));
      } catch (err: any) {
        setError(err?.detail || err?.message || 'Davet linki geçersiz veya süresi dolmuş.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const canSubmit =
    form.full_name.trim() && form.email.trim() && form.password.trim().length >= 8 && !submitting;

  const handleRegister = async () => {
    if (!inviteSource || !canSubmit || !isSupabaseConfigured) return;
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: normalizeTurkishPhone(form.phone) || null,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };
      if (inviteSource.kind === 'code') {
        await registerPublicInviteCode(inviteSource.value, payload);
      } else {
        await registerPublicInvite(inviteSource.value, payload);
      }
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (signInError || !data.user) {
        router.replace('/login' as never);
        return;
      }
      const userData = await buildUserDataForSession(data.user.id);
      await persistUserData(userData);
      router.replace(userData.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard');
    } catch (err: any) {
      Alert.alert('Kayıt tamamlanamadı', err?.detail || err?.message || 'Lütfen bilgileri kontrol edin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFallbackCode = async () => {
    const code = normalizeInviteCode(fallbackCode);
    if (code.length !== 8 || checkingCode) return;
    setCheckingCode(true);
    try {
      const result = await lookupPublicInviteCode(code);
      setInvite(result);
      setInviteSource({ kind: 'code', value: code });
      setError('');
      setForm((prev) => ({
        ...prev,
        full_name: prev.full_name || result.prefill_full_name || '',
        phone: prev.phone || result.prefill_phone || '',
        email: prev.email || result.prefill_email || '',
      }));
    } catch (err: any) {
      Alert.alert('Davet kodu acilamadi', err?.detail || err?.message || 'Davet kodu gecersiz veya suresi dolmus.');
    } finally {
      setCheckingCode(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerPanel}>
          <MaterialIcons name="link-off" size={42} color={theme.colors.error} />
          <Text style={styles.title}>Davet açılamadı</Text>
          <Text style={styles.body}>{error}</Text>
          <View style={styles.codeBox}>
            <Text style={styles.label}>Davet kodunuz varsa girin</Text>
            <TextInput
              style={styles.input}
              placeholder="Orn: K7M2P9QA"
              placeholderTextColor={theme.colors.textMuted}
              value={fallbackCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              onChangeText={(value) => setFallbackCode(normalizeInviteCode(value))}
            />
            <TouchableOpacity
              style={[
                styles.primaryButton,
                normalizeInviteCode(fallbackCode).length !== 8 && styles.primaryButtonDisabled,
              ]}
              onPress={handleFallbackCode}
              disabled={normalizeInviteCode(fallbackCode).length !== 8 || checkingCode}
            >
              {checkingCode ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.primaryButtonText}>Kodla Devam Et</Text>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/login' as never)}>
            <Text style={styles.primaryButtonText}>Giriş ekranına dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="person-add-alt-1" size={28} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>
            {invite.office_name} sizi {invite.role === 'landlord' ? 'ev sahibi' : 'kiracı'} olarak sisteme davet etti
          </Text>
          <Text style={styles.body}>Hesabınız oluşturulduktan sonra emlak ofisinin onayı beklenecek.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Ad Soyad"
            placeholderTextColor={theme.colors.textMuted}
            value={form.full_name}
            onChangeText={(full_name) => setForm((prev) => ({ ...prev, full_name }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Telefon"
            placeholderTextColor={theme.colors.textMuted}
            value={form.phone}
            keyboardType="phone-pad"
            onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))}
            onBlur={() => setForm((prev) => ({ ...prev, phone: normalizeTurkishPhone(prev.phone) }))}
          />
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            placeholderTextColor={theme.colors.textMuted}
            value={form.email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre (min. 8 karakter)"
            placeholderTextColor={theme.colors.textMuted}
            value={form.password}
            secureTextEntry
            onChangeText={(password) => setForm((prev) => ({ ...prev, password }))}
          />

          <TouchableOpacity
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
            onPress={handleRegister}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
    content: { flexGrow: 1, padding: theme.spacing.xl, justifyContent: 'center', gap: theme.spacing.xl },
    centerPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.md },
    header: { alignItems: 'center', gap: theme.spacing.md },
    iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    title: { fontSize: theme.fontSize.xxl, lineHeight: 31, color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold, textAlign: 'center' },
    body: { fontSize: theme.fontSize.md, lineHeight: 22, color: theme.colors.textSecondary, textAlign: 'center' },
    form: { gap: theme.spacing.md },
    codeBox: {
      width: '100%',
      gap: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
    },
    label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: theme.fontWeight.semibold },
    input: {
      minHeight: 56,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.textPrimary,
      paddingHorizontal: theme.spacing.lg,
      fontSize: theme.fontSize.base,
    },
    primaryButton: {
      minHeight: 54,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
    },
    primaryButtonDisabled: { opacity: 0.55 },
    primaryButtonText: { color: theme.colors.textInverse, fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.bold },
  })
);
