import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';

import { createThemedStyles, useAppTheme } from '../theme';
import { createInvite, type InviteRole } from '../../services/appApi';
import { normalizeTurkishPhone } from '../../utils/phone';

type EntryMethod = 'contacts' | 'manual';

export default function InviteCreateScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const [role, setRole] = useState<InviteRole | null>(null);
  const [entryMethod, setEntryMethod] = useState<EntryMethod>('manual');
  const [contactLabel, setContactLabel] = useState('');
  const [prefillName, setPrefillName] = useState('');
  const [prefillPhone, setPrefillPhone] = useState('');
  const [prefillEmail, setPrefillEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState('');
  const [code, setCode] = useState('');

  const canCreate = !!role && !!contactLabel.trim() && !creating;
  const shareText = `Evimos davetiniz:\nLink: ${link}\nKod: ${code}\nKod ve link 24 saat gecerlidir.`;

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
      });
      setLink(response.link);
      setCode(response.code);
    } catch (error: any) {
      Alert.alert('Davet olusturulamadi', error?.detail || error?.message || 'Lutfen tekrar deneyin.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      Alert.alert('Kopyalandi', 'Davet linki ve kodu panoya kopyalandi.');
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
      Alert.alert('Rehber kullanilamiyor', 'Web ortaminda manuel bilgi girisini kullanin.');
      setEntryMethod('manual');
      return;
    }

    try {
      const available = await Contacts.isAvailableAsync();
      if (!available) {
        Alert.alert('Rehber kullanilamiyor', 'Bu cihazda rehber secimi desteklenmiyor.');
        setEntryMethod('manual');
        return;
      }

      if (Platform.OS === 'android') {
        const permission = await Contacts.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('Izin gerekli', 'Rehber izni verilmedi. Manuel bilgi girisini kullanabilirsiniz.');
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
      Alert.alert('Rehber acilamadi', 'Kisi secilemedi. Manuel bilgi girisini kullanabilirsiniz.');
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
        <View style={styles.segment}>
          {([
            ['tenant', 'Kiraci', 'person'] as const,
            ['landlord', 'Ev Sahibi', 'home'] as const,
          ]).map(([value, label, icon]) => (
            <TouchableOpacity
              key={value}
              style={[styles.segmentButton, role === value && styles.segmentButtonActive]}
              onPress={() => setRole(value)}
              activeOpacity={0.85}
            >
              <MaterialIcons name={icon} size={20} color={role === value ? theme.colors.textInverse : theme.colors.primary} />
              <Text style={[styles.segmentText, role === value && styles.segmentTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Kisi ekleme yontemi</Text>
          <View style={styles.segment}>
            {([
              ['contacts', 'Rehberden Sec', 'contacts'] as const,
              ['manual', 'Manuel Gir', 'edit'] as const,
            ]).map(([value, label, icon]) => (
              <TouchableOpacity
                key={value}
                style={[styles.segmentButton, entryMethod === value && styles.segmentButtonActive]}
                onPress={() => {
                  setEntryMethod(value);
                  if (value === 'contacts') void handlePickContact();
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name={icon} size={20} color={entryMethod === value ? theme.colors.textInverse : theme.colors.primary} />
                <Text style={[styles.segmentText, entryMethod === value && styles.segmentTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Secilen / davet edilecek kisi bilgisi</Text>
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
          <Text style={styles.helpText}>Rehberden sadece sectiginiz kisinin bilgileri bu forma alinir; tum rehber aktarilmaz.</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Bu kisi sizin rehberinizde nasil gorunsun?</Text>
          <TextInput
            style={styles.input}
            value={contactLabel}
            onChangeText={setContactLabel}
            placeholder="Orn: Ahmet Daire 5, Besevler Kiraci"
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={styles.helpText}>Bu takma ad profil adi degildir; yalniz agent kontrol alaninda kullanilir.</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, !canCreate && styles.primaryButtonDisabled]}
          onPress={handleCreate}
          disabled={!canCreate}
        >
          <MaterialIcons name="link" size={20} color={theme.colors.textInverse} />
          <Text style={styles.primaryButtonText}>{creating ? 'Olusturuluyor' : 'Davet Linki ve Kodu Olustur'}</Text>
        </TouchableOpacity>

        {link ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>24 saat gecerli tek kullanimlik link ve kod</Text>
            <Text style={styles.linkText} numberOfLines={3}>{link}</Text>
            <Text style={styles.codeText}>Kod: {code}</Text>
            <Text style={styles.helpText}>Kod sadece bu ekranda gosterilir. Kaybolursa yeni davet olusturun.</Text>
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
      backgroundColor: theme.colors.surface,
    },
    headerTitle: { fontSize: theme.fontSize.xl, color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg },
    segment: { flexDirection: 'row', gap: theme.spacing.sm },
    segmentButton: {
      flex: 1,
      minHeight: 52,
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
    segmentText: { color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.sm },
    segmentTextActive: { color: theme.colors.textInverse },
    fieldGroup: { gap: theme.spacing.sm },
    label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: theme.fontWeight.semibold },
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
      minHeight: 54,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    primaryButtonDisabled: { opacity: 0.55 },
    primaryButtonText: { color: theme.colors.textInverse, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.base },
    resultBox: {
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
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
