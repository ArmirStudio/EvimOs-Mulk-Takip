import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, StatusBar, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { tr } from '../../app/translations';
import { useUserData } from '../../hooks/useUserData';
import { supabase } from '../../services/supabase';
import AnimatedScreen from './AnimatedScreen';
import KeyboardAwareScrollView, { scrollToInput } from './KeyboardAwareScrollView';

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    backgroundColor: theme.colors.background,
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center', alignItems: 'center',
    ...theme.shadows.sm,
  },
  topTitle: {
    flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  securityCard: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 20, padding: 20, alignItems: 'center',
    ...theme.shadows.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  lockIconBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 15, fontWeight: '700',
    color: theme.colors.textPrimary, marginBottom: 4,
  },
  securitySub: {
    fontSize: 12, color: theme.colors.textSecondary,
    opacity: 0.7, textAlign: 'center',
  },
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: theme.colors.primary, marginRight: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.8 },
  fieldCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: 12, overflow: 'hidden',
    ...theme.shadows.sm,
  },
  fieldInner: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  fieldIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, letterSpacing: 0.4, marginBottom: 4 },
  fieldInput: { fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary, padding: 0 },
  eyeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: -4, gap: 10 },
  strengthBars: { flex: 1, flexDirection: 'row', gap: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  matchBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12, marginBottom: 12 },
  matchText: { fontSize: 13, fontWeight: '600' },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14, height: 52,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
    ...theme.shadows.md,
  },
  submitBtnDisabled: { backgroundColor: theme.colors.surface2, ...theme.shadows.sm },
  submitBtnText: { color: theme.colors.textInverse, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
}));

export default function ChangePasswordScreen() {
  const theme = useAppTheme();
  const s = useStyles();
  const scrollRef = React.useRef<ScrollView>(null);
  const currentPassRef = React.useRef<TextInput>(null);
  const newPassRef = React.useRef<TextInput>(null);
  const confirmPassRef = React.useRef<TextInput>(null);
  const { userData } = useUserData();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPassConfirm, setNewPassConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [strength, setStrength] = useState<0 | 1 | 2 | 3>(0);

  const calcStrength = (pass: string): 0 | 1 | 2 | 3 => {
    if (pass.length === 0) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    return Math.min(score, 3) as 0 | 1 | 2 | 3;
  };

  React.useEffect(() => { setStrength(calcStrength(newPass)); }, [newPass]);

  const strengthColor = [theme.colors.border, theme.colors.error, theme.colors.warning, theme.colors.success][strength];
  const strengthTextColor = [theme.colors.textMuted, theme.colors.errorText, theme.colors.warningText, theme.colors.successText][strength];
  const strengthLabel = ['', tr.settings.passwordStrengthWeak, tr.settings.passwordStrengthMedium, tr.settings.passwordStrengthStrong][strength];

  const isMatch = newPass === newPassConfirm && newPassConfirm.length > 0;
  const canSubmit = !!currentPass && newPass.length >= 6 && isMatch && !saving;

  const handleChangePassword = async () => {
    if (!currentPass.trim()) { Alert.alert('Gerekli Alan', tr.settings.currentPassword + ' boÅŸ bÄ±rakÄ±lamaz.'); return; }
    if (newPass.length < 6) { Alert.alert('Hata', tr.settings.passwordMinLength); return; }
    if (!isMatch) { Alert.alert('Hata', tr.settings.passwordMismatch); return; }

    setSaving(true);
    try {
      if (!userData?.email) throw new Error('Email bulunamadÄ±');
      const { error: authError } = await supabase.auth.signInWithPassword({ email: userData.email, password: currentPass });
      if (authError) { Alert.alert('Hata', tr.settings.wrongCurrentPassword); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
      if (updateError) throw updateError;
      Alert.alert('BaÅŸarÄ±lÄ±', tr.settings.passwordChanged);
      router.back();
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Åifre deÄŸiÅŸtirilirken hata oluÅŸtu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedScreen type="fade">
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <KeyboardAwareScrollView
          scrollRef={scrollRef}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
            <View style={s.topBar}>
              <TouchableOpacity style={s.topBtn} onPress={() => router.back()}>
                <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.topTitle}>{tr.settings.changePassword}</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={s.securityCard}>
              <View style={s.lockIconBox}>
                <MaterialIcons name="shield" size={44} color={theme.colors.primary} />
              </View>
              <Text style={s.securityTitle}>HesabÄ±nÄ±zÄ± gÃ¼vende tutun</Text>
              <Text style={s.securitySub}>GÃ¼Ã§lÃ¼ bir ÅŸifre belirleyin, dÃ¼zenli gÃ¼ncelleyin.</Text>
            </View>

            <View style={s.body}>
              <View style={s.sectionHeader}>
                <View style={s.sectionAccent} />
                <Text style={s.sectionTitle}>ÅÄ°FRE GÃœNCELLE</Text>
              </View>

              <PasswordField
                icon="lock-outline"
                label={tr.settings.currentPassword}
                value={currentPass}
                onChangeText={setCurrentPass}
                showPass={showCurrent}
                onToggle={() => setShowCurrent(v => !v)}
                editable={!saving}
                inputRef={currentPassRef}
                onFocusInput={() => scrollToInput(scrollRef, currentPassRef, 120)}
                returnKeyType="next"
                onSubmitEditing={() => newPassRef.current?.focus()}
              />
              <PasswordField
                icon="lock-open"
                label={tr.settings.newPassword}
                value={newPass}
                onChangeText={setNewPass}
                showPass={showNew}
                onToggle={() => setShowNew(v => !v)}
                editable={!saving}
                inputRef={newPassRef}
                onFocusInput={() => scrollToInput(scrollRef, newPassRef, 120)}
                returnKeyType="next"
                onSubmitEditing={() => confirmPassRef.current?.focus()}
              />

              {newPass.length > 0 && (
                <View style={s.strengthRow}>
                  <View style={s.strengthBars}>
                    {[0, 1, 2].map(i => (
                      <View key={i} style={[s.strengthBar, { backgroundColor: i < strength ? strengthColor : theme.colors.border }]} />
                    ))}
                  </View>
                  <Text style={[s.strengthLabel, { color: strengthTextColor }]}>{strengthLabel}</Text>
                </View>
              )}

              <PasswordField
                icon="lock"
                label={tr.settings.newPasswordConfirm}
                value={newPassConfirm}
                onChangeText={setNewPassConfirm}
                showPass={showConfirm}
                onToggle={() => setShowConfirm(v => !v)}
                editable={!saving}
                inputRef={confirmPassRef}
                onFocusInput={() => scrollToInput(scrollRef, confirmPassRef, 120)}
                returnKeyType="done"
                onSubmitEditing={handleChangePassword}
              />

              {newPassConfirm.length > 0 && (
                <View style={[s.matchBanner, { backgroundColor: isMatch ? theme.colors.successLight : theme.colors.errorLight }]}>
                  <MaterialIcons name={isMatch ? 'check-circle' : 'cancel'} size={20} color={isMatch ? theme.colors.success : theme.colors.error} />
                  <Text style={[s.matchText, { color: isMatch ? theme.colors.successText : theme.colors.errorText }]}>
                    {isMatch ? 'Åifreler eÅŸleÅŸiyor' : tr.settings.passwordMismatch}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]} onPress={handleChangePassword} disabled={!canSubmit} activeOpacity={0.8}>
                {saving
                  ? <ActivityIndicator size="small" color={theme.colors.textInverse} />
                  : <>
                      <MaterialIcons name="lock" size={18} color={canSubmit ? theme.colors.textInverse : theme.colors.textMuted} style={{ marginRight: 8 }} />
                      <Text style={[s.submitBtnText, !canSubmit && { color: theme.colors.textMuted }]}>Åifreyi GÃ¼ncelle</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </AnimatedScreen>
  );
}

function PasswordField({
  icon, label, value, onChangeText, showPass, onToggle, editable, inputRef, onFocusInput, onSubmitEditing, returnKeyType,
}: {
  icon: string; label: string; value: string;
  onChangeText: (t: string) => void;
  showPass: boolean; onToggle: () => void; editable: boolean;
  inputRef: React.RefObject<TextInput | null>;
  onFocusInput: () => void;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next';
}) {
  const theme = useAppTheme();
  const s = useStyles();
  return (
    <View style={s.fieldCard}>
      <View style={s.fieldInner}>
        <View style={s.fieldIconBox}>
          <MaterialIcons name={icon as any} size={20} color={theme.colors.primary} />
        </View>
        <View style={s.fieldContent}>
          <Text style={s.fieldLabel}>{label}</Text>
          <TextInput
            ref={inputRef}
            style={s.fieldInput}
            placeholder="••••••••"
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry={!showPass}
            value={value}
            onChangeText={onChangeText}
            editable={editable}
            autoCapitalize="none"
            onFocus={onFocusInput}
            onSubmitEditing={onSubmitEditing}
            returnKeyType={returnKeyType}
          />
        </View>
        <TouchableOpacity style={s.eyeBtn} onPress={onToggle}>
          <MaterialIcons name={showPass ? 'visibility' : 'visibility-off'} size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
