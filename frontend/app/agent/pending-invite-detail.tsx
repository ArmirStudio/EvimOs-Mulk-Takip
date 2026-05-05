import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { createThemedStyles, useAppTheme } from '../theme';
import {
  approvePendingInvite,
  getPendingInviteDetail,
  rejectPendingInvite,
  updatePendingInviteLabel,
  type PendingInviteUser,
} from '../../services/appApi';
import { getUserData, type UserData } from '../../hooks/useUserData';

export default function PendingInviteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const styles = useStyles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<PendingInviteUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [label, setLabel] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const user = await getUserData();
      setCurrentUser(user);
      const response = await getPendingInviteDetail(id);
      setItem(response.pending);
      setLabel(response.pending.invites?.contact_label || '');
    } catch (error: any) {
      Alert.alert('Kayıt bulunamadı', error?.detail || error?.message || 'Onay bekleyen kişi bulunamadı.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      await approvePendingInvite(id);
      Alert.alert('Onaylandı', 'Kullanıcı hesabı aktif edildi.');
      router.replace('/agent/pending-invites' as never);
    } catch (error: any) {
      Alert.alert('Onaylanamadı', error?.detail || error?.message || 'Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLabel = async () => {
    if (!id || !label.trim() || saving) return;
    setSaving(true);
    try {
      await updatePendingInviteLabel(id, label.trim());
      await load();
      Alert.alert('Kaydedildi', 'Rehber adı güncellendi.');
    } catch (error: any) {
      Alert.alert('Kaydedilemedi', error?.detail || error?.message || 'Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = () => {
    if (!id || saving) return;
    Alert.alert(
      'Kişiyi reddet',
      'Bu kişiyi reddetmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await rejectPendingInvite(id);
              Alert.alert('Reddedildi', 'Kullanıcı hesabı silindi.');
              router.replace('/agent/pending-invites' as never);
            } catch (error: any) {
              Alert.alert('Reddedilemedi', error?.detail || error?.message || 'Lütfen tekrar deneyin.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !item) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const canEditContactLabel = currentUser?.role === 'agent';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Davet Detayı</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.full_name || '?').slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.full_name || 'Profil adı yok'}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            {!!item.phone && <Text style={styles.meta}>{item.phone}</Text>}
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{item.role === 'landlord' ? 'Ev Sahibi' : 'Kiracı'}</Text>
          </View>
        </View>

        {canEditContactLabel ? (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Rehber adı</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Rehber adı"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveLabel} disabled={saving}>
            <MaterialIcons name="save" size={18} color={theme.colors.primary} />
            <Text style={styles.secondaryButtonText}>Rehber adını kaydet</Text>
          </TouchableOpacity>
        </View>
        ) : null}

        <TouchableOpacity style={styles.approveButton} onPress={handleApprove} disabled={saving}>
          <MaterialIcons name="check-circle" size={20} color={theme.colors.textInverse} />
          <Text style={styles.approveButtonText}>Onayla</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rejectButton} onPress={handleReject} disabled={saving}>
          <MaterialIcons name="delete-forever" size={20} color={theme.colors.error} />
          <Text style={styles.rejectButtonText}>Reddet ve hesabı sil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
    iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
    headerTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
    profileCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg },
    avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    avatarText: { color: theme.colors.primary, fontWeight: theme.fontWeight.bold },
    name: { fontSize: theme.fontSize.lg, color: theme.colors.textPrimary, fontWeight: theme.fontWeight.bold },
    meta: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
    roleBadge: { borderRadius: 999, paddingHorizontal: theme.spacing.sm, paddingVertical: 5, backgroundColor: theme.colors.surface2 },
    roleBadgeText: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, fontWeight: theme.fontWeight.bold },
    fieldGroup: { gap: theme.spacing.sm },
    label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: theme.fontWeight.semibold },
    input: { minHeight: 54, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, paddingHorizontal: theme.spacing.lg, fontSize: theme.fontSize.base },
    secondaryButton: { minHeight: 46, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: theme.spacing.sm },
    secondaryButtonText: { color: theme.colors.primary, fontWeight: theme.fontWeight.bold },
    approveButton: { minHeight: 54, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: theme.spacing.sm },
    approveButtonText: { color: theme.colors.textInverse, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.base },
    rejectButton: { minHeight: 54, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.errorLight, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: theme.spacing.sm },
    rejectButtonText: { color: theme.colors.error, fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.base },
  })
);
