import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
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
import Animated, { ZoomIn, FadeIn } from 'react-native-reanimated';

import { createThemedStyles, useAppTheme } from '../theme';
import { createInvite, type InviteRole } from '../../services/appApi';

type EmployeeAccessLevel = 'full' | 'limited';

const ROLE_OPTIONS: { value: InviteRole; label: string; icon: keyof typeof MaterialIcons.glyphMap; desc: string }[] = [
  { value: 'tenant', label: 'Kiracı', icon: 'person', desc: 'Kira ödemeleri, bakım talepleri' },
  { value: 'landlord', label: 'Ev Sahibi', icon: 'home', desc: 'Mülk yönetimi, onaylar' },
  { value: 'employee', label: 'Çalışan', icon: 'badge', desc: 'Ekip görevleri, raporlar' },
];

export default function InviteCreateScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ role?: string; access?: string }>();

  const initialRole = useMemo<InviteRole | null>(() => {
    return params.role === 'tenant' || params.role === 'landlord' || params.role === 'employee'
      ? params.role
      : null;
  }, [params.role]);

  const [role, setRole] = useState<InviteRole | null>(initialRole);
  const [employeeAccessLevel, setEmployeeAccessLevel] = useState<EmployeeAccessLevel>(
    params.access === 'full' ? 'full' : 'limited',
  );
  const [contactLabel, setContactLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [codeModalVisible, setCodeModalVisible] = useState(false);

  const canCreate = !!role && !!contactLabel.trim() && !creating;

  const shareText = `EvimOS davet kodunuz: ${code}\n24 saat geçerlidir.`;

  const handleCreate = async () => {
    if (!role || !canCreate) return;
    setCreating(true);
    try {
      const response = await createInvite({
        role,
        contact_label: contactLabel.trim(),
        prefill_full_name: null,
        prefill_phone: null,
        prefill_email: null,
        employee_access_level: role === 'employee' ? employeeAccessLevel : null,
      });
      setCode(response.code);
      setCodeModalVisible(true);
    } catch (error: any) {
      Alert.alert('Davet oluşturulamadı', error?.detail || error?.message || 'Lütfen tekrar deneyin.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      Alert.alert('Kopyalandı', 'Davet kodu panoya kopyalandı.');
      return;
    }
    await Share.share({ message: shareText });
  };

  const handleWhatsapp = () => {
    if (!code) return;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareText)}`).catch(() =>
      Share.share({ message: shareText }),
    );
  };

  const handleSms = () => {
    if (!code) return;
    Linking.openURL(`sms:?body=${encodeURIComponent(shareText)}`).catch(() =>
      Share.share({ message: shareText }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Davet Et</Text>
        <TouchableOpacity
          onPress={() => router.push('/agent/pending-invites' as never)}
          style={styles.iconButton}
        >
          <MaterialIcons name="pending-actions" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Rol Seçimi */}
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
                  <View style={[styles.roleIconWrap, active && styles.roleIconWrapActive]}>
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={active ? theme.colors.primary : theme.colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{item.label}</Text>
                  <Text style={[styles.roleDesc, active && styles.roleDescActive]} numberOfLines={2}>
                    {item.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Çalışan Yetkisi */}
        {role === 'employee' && (
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>Çalışan yetkisi</Text>
            <View style={styles.segment}>
              {([
                ['limited', 'Sınırlı', 'visibility'] as const,
                ['full', 'Tam Yetki', 'admin-panel-settings'] as const,
              ]).map(([value, label, icon]) => {
                const active = employeeAccessLevel === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.segmentButton, active && styles.segmentButtonActive]}
                    onPress={() => setEmployeeAccessLevel(value)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name={icon}
                      size={18}
                      color={active ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.helpText}>
              Tam yetkili çalışan ofis kayıtlarını yönetebilir; sınırlı çalışan sadece atanan işlere odaklanır.
            </Text>
          </View>
        )}

        {/* Rehber Etiketi */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Rehber etiketi *</Text>
          <TextInput
            style={styles.input}
            value={contactLabel}
            onChangeText={setContactLabel}
            placeholder="Örn: Ahmet Bey, Beşevler Daire 5"
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={styles.helpText}>
            Bu isim profil adı değildir; sadece ofis kontrol panelinizde görünür.
          </Text>
        </View>

        {/* Oluştur Butonu */}
        <TouchableOpacity
          style={[styles.primaryButton, !canCreate && styles.primaryButtonDisabled]}
          onPress={handleCreate}
          disabled={!canCreate}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name={creating ? 'hourglass-empty' : 'key'}
            size={20}
            color={theme.colors.textInverse}
          />
          <Text style={styles.primaryButtonText}>
            {creating ? 'Oluşturuluyor…' : 'Davet Kodu Oluştur'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Animasyonlu Kod Kartı Modal */}
      <Modal
        visible={codeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCodeModalVisible(false)}
        statusBarTranslucent
      >
        <Animated.View entering={FadeIn.duration(200)} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCodeModalVisible(false)} />
          <Animated.View entering={ZoomIn.duration(320).springify().damping(14)} style={styles.codeCard}>
            {/* Kapat */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setCodeModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* İkon */}
            <View style={styles.codeIconWrap}>
              <MaterialIcons name="key" size={28} color={theme.colors.primary} />
            </View>

            <Text style={styles.codeCardTitle}>Davet Kodu</Text>
            <Text style={styles.codeDisplay}>{code}</Text>
            <Text style={styles.codeExpiry}>24 saat geçerlidir · Tek kullanımlık</Text>

            <View style={styles.divider} />

            {/* Paylaşım Butonları */}
            <View style={styles.shareRow}>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnWhatsapp]} onPress={handleWhatsapp} activeOpacity={0.85}>
                <MaterialIcons name="chat" size={20} color="#ffffff" />
                <Text style={styles.shareBtnText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnSms]} onPress={handleSms} activeOpacity={0.85}>
                <MaterialIcons name="sms" size={20} color="#ffffff" />
                <Text style={styles.shareBtnText}>SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnCopy]} onPress={handleCopy} activeOpacity={0.85}>
                <MaterialIcons name="content-copy" size={20} color={theme.colors.textPrimary} />
                <Text style={[styles.shareBtnText, { color: theme.colors.textPrimary }]}>Kopyala</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.codeNote}>
              Kod yalnızca bu ekranda gösterilir. Kaybedilirse yeni davet oluşturun.
            </Text>
          </Animated.View>
        </Animated.View>
      </Modal>
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
    headerTitle: {
      fontSize: theme.fontSize.xl,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.bold,
    },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.lg,
    },
    glassCard: {
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.navGlass,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      ...theme.shadows.sm,
    },
    cardTitle: {
      fontSize: theme.fontSize.base,
      color: theme.colors.textPrimary,
      fontWeight: theme.fontWeight.bold,
    },
    roleGrid: { flexDirection: 'row', gap: theme.spacing.sm },
    roleButton: {
      flex: 1,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      gap: 6,
    },
    roleButtonActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    roleIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface2,
    },
    roleIconWrapActive: { backgroundColor: `${theme.colors.primary}22` },
    roleLabel: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    roleLabelActive: { color: theme.colors.primary },
    roleDesc: {
      fontSize: 10,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 14,
    },
    roleDescActive: { color: theme.colors.primary, opacity: 0.8 },
    segment: { flexDirection: 'row', gap: theme.spacing.sm },
    segmentButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    segmentButtonActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    segmentText: {
      color: theme.colors.textMuted,
      fontWeight: theme.fontWeight.bold,
      fontSize: theme.fontSize.sm,
    },
    segmentTextActive: { color: theme.colors.primary },
    helpText: {
      fontSize: theme.fontSize.xs,
      lineHeight: 17,
      color: theme.colors.textMuted,
    },
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
      minHeight: 58,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      ...theme.shadows.md,
    },
    primaryButtonDisabled: { opacity: 0.5 },
    primaryButtonText: {
      color: theme.colors.textInverse,
      fontWeight: theme.fontWeight.bold,
      fontSize: theme.fontSize.base,
    },

    // ── Modal ──
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 24,
    },
    codeCard: {
      width: '100%',
      borderRadius: 28,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 28,
      alignItems: 'center',
      gap: 12,
      ...theme.shadows.lg,
    },
    closeBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface2,
    },
    codeIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
      marginBottom: 4,
    },
    codeCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    codeDisplay: {
      fontSize: 38,
      fontWeight: '900',
      color: theme.colors.primary,
      letterSpacing: 10,
      fontVariant: ['tabular-nums'],
    },
    codeExpiry: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
    divider: {
      width: '100%',
      height: 1,
      backgroundColor: theme.colors.divider,
      marginVertical: 4,
    },
    shareRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    shareBtn: {
      flex: 1,
      minHeight: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    shareBtnWhatsapp: { backgroundColor: '#25D366' },
    shareBtnSms: { backgroundColor: theme.colors.primary },
    shareBtnCopy: {
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    shareBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
    },
    codeNote: {
      fontSize: 11,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 16,
    },
  }),
);
