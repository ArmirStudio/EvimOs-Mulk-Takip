import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';
import { deleteUser, getTeamMemberDetail, updateUser } from '../../services/appApi';
import type { TeamMemberDetail } from '../../services/teamTypes';
import { hasFullEmployeeAccess } from '../../utils/employeeAccess';
import { formatLongDate } from '../../utils/teamPresentation';

export default function TeamMemberDetailScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { userData, loading: userLoading } = useUserData();

  const isManager = userData?.role === 'agent' || hasFullEmployeeAccess(userData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<TeamMemberDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [accessLevel, setAccessLevel] = useState<'full' | 'limited'>('limited');

  const loadDetail = useCallback(async () => {
    if (userLoading) {
      return;
    }

    if (!id || !isManager) {
      router.replace('/agent/team?tab=team' as never);
      return;
    }
    try {
      setLoading(true);
      const response = await getTeamMemberDetail(id);
      setDetail(response);
      setFullName(response.member.full_name || '');
      setPhone(response.member.phone || '');
      setCity(response.member.city || '');
      setDistrict(response.member.district || '');
      setAccessLevel(response.member.employee_access_level === 'full' ? 'full' : 'limited');
    } catch {
      router.replace('/agent/team?tab=team' as never);
    } finally {
      setLoading(false);
    }
  }, [id, isManager, userLoading]);

  useFocusEffect(useCallback(() => { loadDetail(); }, [loadDetail]));

  const submitUpdate = async () => {
    if (!detail?.member || detail.member.role !== 'employee') return;
    try {
      setSaving(true);
      await updateUser(detail.member.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
        district: district.trim() || null,
        employee_access_level: accessLevel,
      });
      setEditOpen(false);
      await loadDetail();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !detail) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const { member, metrics } = detail;
  const canAssignTask = member.role === 'employee' && isManager;
  const canEdit = member.role === 'employee' && isManager;
  const canDelete = member.role === 'employee' && userData?.role === 'agent';

  const handleDelete = () => {
    if (!canDelete) {
      return;
    }

    Alert.alert(
      'Çalışanı Sil',
      `${member.full_name} kaydını silmek istediğinize emin misiniz? Bu işlem mülk atamasını da temizler.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await deleteUser(member.id);
              router.replace('/agent/team?tab=team' as never);
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Çalışan silinemedi.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Çalışan Detayı</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(member.full_name || '?').slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{member.full_name}</Text>
            <Text style={styles.meta}>{member.email || 'E-posta yok'}</Text>
            <Text style={styles.meta}>{member.phone || 'Telefon yok'}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Iletisim ve Uyelik</Text>
          <Text style={styles.infoLine}>Telefon: {member.phone || 'Yok'}</Text>
          <Text style={styles.infoLine}>Sehir: {member.city || 'Yok'}</Text>
          <Text style={styles.infoLine}>Ilce: {member.district || 'Yok'}</Text>
          <Text style={styles.infoLine}>Ise Baslama: {formatLongDate(member.created_at)}</Text>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.completed_tasks_this_month}</Text>
            <Text style={styles.metricLabel}>Bu Ay Tamamlanan</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.property_showings_this_month}</Text>
            <Text style={styles.metricLabel}>Ev Gösterimi</Text>
          </View>
        </View>

        {(canAssignTask || canEdit) && (
          <View style={styles.actionsRow}>
            {canAssignTask && (
              <TouchableOpacity style={styles.primaryAction} onPress={() => router.push(`/agent/team?tab=tasks&composeTask=1&assigneeId=${member.id}` as never)}>
                <MaterialIcons name="task-alt" size={16} color={theme.colors.textInverse} />
                <Text style={styles.primaryActionText}>Görev Ata</Text>
              </TouchableOpacity>
            )}
            {canEdit && (
              <TouchableOpacity style={styles.secondaryAction} onPress={() => setEditOpen(true)}>
                <MaterialIcons name="edit" size={16} color={theme.colors.primary} />
                <Text style={styles.secondaryActionText}>Düzenle</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity style={styles.deleteAction} onPress={handleDelete} disabled={saving}>
                <MaterialIcons name="delete-outline" size={16} color={theme.colors.error} />
                <Text style={styles.deleteActionText}>Sil</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Çalışanı Düzenle</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" placeholderTextColor={theme.colors.textMuted} />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Telefon" placeholderTextColor={theme.colors.textMuted} />
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Sehir" placeholderTextColor={theme.colors.textMuted} />
            <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="Ilce" placeholderTextColor={theme.colors.textMuted} />
            <View style={styles.actionsRow}>
              {(['limited', 'full'] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.secondaryAction, accessLevel === value && styles.secondaryActionActive]}
                  onPress={() => setAccessLevel(value)}
                >
                  <Text style={[styles.secondaryActionText, accessLevel === value && styles.secondaryActionTextActive]}>
                    {value === 'full' ? 'Tam Yetki' : 'Sinirli Yetki'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryAction} onPress={submitUpdate} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={theme.colors.textInverse} /> : <Text style={styles.primaryActionText}>Kaydet</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
    headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface2 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
    scrollContent: { padding: 16, gap: 14, paddingBottom: 120 },
    heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.colors.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
    avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    avatarText: { fontSize: 20, fontWeight: '800', color: theme.colors.primary },
    name: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
    meta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
    infoCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    cardTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 12 },
    infoLine: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 6 },
    metricRow: { flexDirection: 'row', gap: 10 },
    metricCard: { flex: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    metricValue: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary },
    metricLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginTop: 6, textAlign: 'center' },
    actionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    primaryAction: { minHeight: 48, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
    primaryActionText: { fontSize: 13, fontWeight: '700', color: theme.colors.textInverse },
    secondaryAction: { minHeight: 46, borderRadius: 14, backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, flexDirection: 'row', gap: 8 },
    secondaryActionActive: { backgroundColor: theme.colors.primary },
    secondaryActionText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
    secondaryActionTextActive: { color: theme.colors.textInverse },
    deleteAction: { minHeight: 46, borderRadius: 14, backgroundColor: theme.colors.errorLight, borderWidth: 1, borderColor: `${theme.colors.error}44`, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, flexDirection: 'row', gap: 8 },
    deleteActionText: { fontSize: 13, fontWeight: '700', color: theme.colors.error },
    modalOverlay: { flex: 1, backgroundColor: theme.colors.modalBackdrop, justifyContent: 'flex-end', padding: 12 },
    modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 12 },
    input: { borderRadius: 16, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, paddingVertical: 14, color: theme.colors.textPrimary, fontSize: 14 },
  })
);
