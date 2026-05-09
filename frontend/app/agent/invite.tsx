import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';

import { createThemedStyles, useAppTheme } from '../theme';
import { createInvite, type InviteRole } from '../../services/appApi';
import { normalizeTurkishPhone } from '../../utils/phone';

type EntryMethod = 'contacts' | 'manual';
type EmployeeAccessLevel = 'full' | 'limited';

const ROLE_OPTIONS: { value: InviteRole; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'tenant', label: 'Kiracı', icon: 'person' },
  { value: 'landlord', label: 'Ev Sahibi', icon: 'home' },
  { value: 'employee', label: 'Çalışan', icon: 'badge' },
];

export default function InviteCreateScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ role?: string; name?: string; phone?: string; email?: string; access?: string }>();
  const initialRole = useMemo<InviteRole | null>(() => {
    return params.role === 'tenant' || params.role === 'landlord' || params.role === 'employee'
      ? params.role
      : null;
  }, [params.role]);

  const [role, setRole] = useState<InviteRole | null>(initialRole);
  const [employeeAccessLevel, setEmployeeAccessLevel] = useState<EmployeeAccessLevel>(params.access === 'full' ? 'full' : 'limited');
  const [entryMethod, setEntryMethod] = useState<EntryMethod>('manual');
  const [contactLabel, setContactLabel] = useState(typeof params.name === 'string' ? params.name : '');
  const [prefillName, setPrefillName] = useState(typeof params.name === 'string' ? params.name : '');
  const [prefillPhone, setPrefillPhone] = useState(typeof params.phone === 'string' ? params.phone : '');
  const [prefillEmail, setPrefillEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState('');
  const [code, setCode] = useState('');

  const canCreate = !!role && !!contactLabel.trim() && !creating;
  const shareText = `Evimos davetiniz:\nLink: ${link}\nKod: ${code}\nKod ve link 24 saat geçerlidir.`;

  const handleCreate = async () => {
    if (!role || !canCreate) return;
    setCreating(true);
    try {
      const response = await createInvite({
        role,
        contact_label: contactLabel.trim(),
        prefill_full_name: prefillName.trim() || null,
        prefill_phone: normalizeTurkishPhone(prefillPhone) || null,
        prefill_email: prefillEmail.trim().toLowerCase() || null,
        employee_access_level: role === 'employee' ? employeeAccessLevel : null,
      });
      setLink(response.link);
      setCode(response.code);
    } catch (error: any) {
      Alert.alert('Davet oluşturulamadı', error?.detail || error?.message || 'Lütfen tekrar deneyin.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      Alert.alert('Kopyalandı', 'Davet linki ve kodu panoya kopyalandı.');
      return;
    }
    await Share.share({ message: shareText });
  };

  const handleWhatsapp = () => {
    if (!link) return;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareText)}`).catch(() => Share.share({ message: shareText }));
  };

  const handleSms = () => {
    if (!link) return;
    Linking.openURL(`sms:?body=${encodeURIComponent(shareText)}`).catch(() => Share.share({ message: shareText }));
  };

  const handlePickContact = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Rehber kullanılamıyor', 'Web ortamında manuel bilgi girişini kullanın.');
      setEntryMethod('manual');
      return;
    }

    try {
      const available = await Contacts.isAvailableAsync();
      if (!available) {
        Alert.alert('Rehber kullanılamıyor', 'Bu cihazda rehber seçimi desteklenmiyor.');
        setEntryMethod('manual');
        return;
      }

      if (Platform.OS === 'android') {
        const permission = await Contacts.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('İzin gerekli', 'Rehber izni verilmedi. Manuel bilgi girişini kullanabilirsiniz.');
          setEntryMethod('manual');
          return;
        }
      }

      const selected = await Contacts.presentContactPickerAsync();
      if (!selected) return;

      const contact: any = selected;
      const fullName = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ');
      const phone = contact.phoneNumbers?.[0]?.number || '';
      const email = contact.emails?.[0]?.email || '';
      setEntryMethod('contacts');
      setPrefillName(fullName || '');
      setPrefillPhone(normalizeTurkishPhone(phone));
      setPrefillEmail(email || '');
      if (!contactLabel.trim() && fullName) {
        setContactLabel(fullName);
      }
    } catch {
      Alert.alert('Rehber açılamadı', 'Kişi seçilemedi. Manuel bilgi girişini kullanabilirsiniz.');
      setEntryMethod('manual');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Davet Et</Text>
        <TouchableOpacity onPress={() => router.push('/agent/pending-invites' as never)} style={styles.iconButton}>
          <MaterialIcons name="pending-actions" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Kimi davet ediyorsunuz?</Text>
          <View style={styles.roleGrid}>
            {ROLE_OPTIONS.map((item) => {
              const active = role === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.roleButton, active && styles.roleButtonActive]}
                  onPress={() => setRole(item.value)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name={item.icon} size={20} color={active ? theme.colors.textInverse : theme.colors.primary} />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {role === 'employee' && (
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>Çalışan yetkisi</Text>
            <View style={styles.segment}>
              {([
                ['limited', 'Sınırlı'] as const,
                ['full', 'Tam yetki'] as const,
              ]).map(([value, label]) => {
                const active = employeeAccessLevel === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.segmentButton, active && styles.segmentButtonActive]}
                    onPress={() => setEmployeeAccessLevel(value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.helpText}>Tam yetkili çalışan ofis kayıtlarını yönetebilir; sınırlı çalışan sadece atanan işlere odaklanır.</Text>
          </View>
        )}

        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Kişi bilgisi</Text>
          <View style={styles.segment}>
            {([
              ['contacts', 'Rehberden Seç', 'contacts'] as const,
              ['manual', 'Manuel Gir', 'edit'] as const,
            ]).map(([value, label, icon]) => {
              const active = entryMethod === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  onPress={() => {
                    setEntryMethod(value);
                    if (value === 'contacts') void handlePickContact();
                  }}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name={icon} size={20} color={active ? theme.colors.textInverse : theme.colors.primary} />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={styles.input}
            value={prefillName}
            onChangeText={setPrefillName}
            placeholder="Ad Soyad (opsiyonel)"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={prefillPhone}
            onChangeText={setPrefillPhone}
            onBlur={() => setPrefillPhone(normalizeTurkishPhone(prefillPhone))}
            keyboardType="phone-pad"
            placeholder="+905321234567"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={prefillEmail}
            onChangeText={setPrefillEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="E-posta (opsiyonel)"
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={styles.helpText}>Rehberden sadece seçtiğiniz kişinin bilgileri bu forma alınır; tüm rehber aktarılmaz.</Text>
        </View>

        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Rehber etiketi</Text>
          <TextInput
            style={styles.input}
            value={contactLabel}
            onChangeText={setContactLabel}
            placeholder="Örn: Ahmet Daire 5, Beşevler Kiracı"
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={styles.helpText}>Bu takma ad profil adı değildir; yalnızca ofis kontrol alanında kullanılır.</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, !canCreate && styles.primaryButtonDisabled]}
          onPress={handleCreate}
          disabled={!canCreate}
        >
          <MaterialIcons name="link" size={20} color={theme.colors.textInverse} />
          <Text style={styles.primaryButtonText}>{creating ? 'Oluşturuluyor' : 'Davet Linki ve Kodu Oluştur'}</Text>
        </TouchableOpacity>

        {link ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>24 saat geçerli tek kullanımlık link ve kod</Text>
            <Text style={styles.linkText} numberOfLines={3}>{link}</Text>
            <Text style={styles.codeText}>Kod: {code}</Text>
            <Text style={styles.helpText}>Kod sadece bu ekranda gösterilir. Kaybolursa yeni davet oluşturun.</Text>
            <View style={styles.shareRow}>
              <TouchableOpacity style={styles.shareButton} onPress={handleWhatsapp}>
                <MaterialIcons name="chat" size={18} color={theme.colors.primary} />
                <Text style={styles.shareText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton} onPress={handleSms}>
                <MaterialIcons name="sms" size={18} color={theme.colors.primary} />
                <Text style={styles.shareText}>SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton} onPress={handleCopy}>
                <MaterialIcons name="content-copy" size={18} color={theme.colors.primary} />
                <Text style={styles.shareText}>Kopyala</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.navGlass,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerTitle: { fontSize: theme.fontSize.xl, color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg },
    glassCard: {
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.navGlass,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      ...theme.shadows.sm,
    },
    cardTitle: { fontSize: theme.fontSize.base, color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
    roleGrid: { flexDirection: 'row', gap: theme.spacing.sm },
    roleButton: {
      flex: 1,
      minHeight: 70,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    roleButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    segment: { flexDirection: 'row', gap: theme.spacing.sm },
    segmentButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    segmentButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    segmentText: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.sm, textAlign: 'center' },
    segmentTextActive: { color: theme.colors.textInverse },
    helpText: { fontSize: theme.fontSize.xs, lineHeight: 17, color: theme.colors.textMuted },
    input: {
      minHeight: 56,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSize.base,
    },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      ...theme.shadows.md,
    },
    primaryButtonDisabled: { opacity: 0.55 },
    primaryButtonText: { color: theme.colors.textInverse, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.base },
    resultBox: {
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.navGlass,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      ...theme.shadows.sm,
    },
    resultLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, fontWeight: theme.fontWeight.semibold },
    linkText: { color: theme.colors.textPrimary, fontSize: theme.fontSize.sm, lineHeight: 20 },
    codeText: { color: theme.colors.primary, fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, letterSpacing: 1.2 },
    shareRow: { flexDirection: 'row', gap: theme.spacing.sm },
    shareButton: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryLight,
      gap: 2,
    },
    shareText: { fontSize: theme.fontSize.xs, color: theme.colors.primary, fontWeight: theme.fontWeight.bold },
  })
);
