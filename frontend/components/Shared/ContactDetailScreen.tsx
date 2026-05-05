import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { deleteUser, getUserDetail } from '../../services/appApi';
import { useUserData } from '../../hooks/useUserData';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Emlakçı',
  landlord: 'Ev Sahibi',
  tenant: 'Kiraci',
  employee: 'Çalışan',
};

const STATUS_LABELS: Record<string, string> = {
  occupied: 'Kirada',
  vacant: 'Bos',
  maintenance: 'Bakimda',
};

function getRoleColors(theme: any): Record<string, { bg: string; text: string }> {
  return {
    agent: { bg: theme.colors.primaryLight, text: theme.colors.primary },
    landlord: { bg: theme.colors.warningLight, text: theme.colors.warningText },
    tenant: { bg: theme.colors.infoLight, text: theme.colors.infoText },
    employee: { bg: theme.colors.successLight, text: theme.colors.successText },
  };
}

function getStatusColors(theme: any): Record<string, string> {
  return {
    occupied: theme.colors.primary,
    vacant: theme.colors.success,
    maintenance: theme.colors.warning,
  };
}

function getInitials(name: string) {
  return name?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ContactDetailScreen() {
  const theme = useAppTheme();
  const s = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userData } = useUserData();
  const insets = useSafeAreaInsets();
  const roleColors = getRoleColors(theme);
  const statusColors = getStatusColors(theme);

  const [contact, setContact] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const response = await getUserDetail(id);
      setContact(response.user);
      setProperties(response.properties || []);
    } catch {
      Alert.alert('Hata', 'Kisi bilgileri yuklenemedi.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDelete = () => {
    Alert.alert(
      'Kaydi Sil',
      `${contact?.full_name ?? 'Bu kisi'} silinecek. Mulk atamalari temizlenecek.`,
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteUser(id);
              Alert.alert('Başarılı', 'Kayıt silindi.', [
                { text: 'Tamam', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Silme islemi basarisiz.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <View style={[s.header, { paddingTop: 8 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Kisi Detayi</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (!contact) {
    return null;
  }

  const roleStyle = roleColors[contact.role] ?? roleColors.tenant;
  const roleLabel = ROLE_LABELS[contact.role] ?? contact.role;
  const canDelete = userData?.role === 'agent' || userData?.role === 'admin';

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <View style={[s.header, { paddingTop: 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kisi Detayi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <View style={s.profileCard}>
          <View style={[s.avatar, { backgroundColor: roleStyle.bg }]}>
            <Text style={[s.avatarText, { color: roleStyle.text }]}>
              {getInitials(contact.full_name ?? '')}
            </Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{contact.full_name ?? '-'}</Text>
            <View style={[s.roleBadge, { backgroundColor: roleStyle.bg }]}>
              <Text style={[s.roleBadgeText, { color: roleStyle.text }]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionLabel}>ILETISIM</Text>
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoIconBg}>
              <MaterialIcons name="email" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>E-posta</Text>
              <Text style={s.infoValue}>{contact.email ?? '-'}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <View style={s.infoIconBg}>
              <MaterialIcons name="phone" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Telefon</Text>
              <Text style={s.infoValue}>{contact.phone ?? 'Girilmemis'}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <View style={s.infoIconBg}>
              <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Kayıt Tarihi</Text>
              <Text style={s.infoValue}>{formatDate(contact.created_at)}</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionLabel}>BAGLI MULKLER</Text>
        {properties.length === 0 ? (
          <View style={s.emptyCard}>
            <MaterialIcons name="home" size={32} color={theme.colors.textMuted} />
            <Text style={s.emptyText}>
              {contact.role === 'landlord' ? 'Sahip oldugu mulk yok' : 'Eslesmis mulk yok'}
            </Text>
          </View>
        ) : (
          properties.map((property) => (
            <View key={property.id} style={s.propCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.propName} numberOfLines={1}>
                  {property.description ?? property.address}
                </Text>
                <View style={s.propAddressRow}>
                  <MaterialIcons name="location-on" size={13} color={theme.colors.textMuted} />
                  <Text style={s.propAddress} numberOfLines={1}>
                    {[property.address, property.district, property.city].filter(Boolean).join(', ')}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View
                  style={[
                    s.statusBadge,
                    { backgroundColor: statusColors[property.status] ?? theme.colors.textMuted },
                  ]}
                >
                  <Text style={s.statusBadgeText}>{STATUS_LABELS[property.status] ?? property.status}</Text>
                </View>
                {!!property.monthly_rent && (
                  <Text style={s.propRent}>₺{Number(property.monthly_rent).toLocaleString('tr-TR')}</Text>
                )}
              </View>
            </View>
          ))
        )}

        {canDelete ? (
          <>
            <Text style={s.sectionLabel}>TEHLIKELI BOLGE</Text>
            <View style={s.dangerCard}>
              <View style={s.dangerInfo}>
                <MaterialIcons name="delete-forever" size={20} color={theme.colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={s.dangerTitle}>Kaydi Sil</Text>
                  <Text style={s.dangerSub}>Profil silinir, atamalar temizlenir</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
                onPress={handleDelete}
                disabled={deleting}
                activeOpacity={0.85}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.deleteBtnText}>Sil</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 20 },
    profileCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { fontSize: 26, fontWeight: '800' },
    profileInfo: { flex: 1, gap: 8 },
    profileName: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    roleBadgeText: { fontSize: 13, fontWeight: '700' },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 10,
      marginTop: 4,
    },
    infoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      marginBottom: 28,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
    infoIconBg: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 2 },
    infoValue: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
    divider: { height: 1, backgroundColor: theme.colors.border, marginLeft: 66 },
    propCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 10,
    },
    propName: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
    propAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    propAddress: { fontSize: 12, color: theme.colors.textMuted },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    propRent: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: 32,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 28,
    },
    emptyText: { fontSize: 14, color: theme.colors.textMuted, marginTop: 10, fontWeight: '500' },
    dangerCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${theme.colors.error}40`,
      overflow: 'hidden',
      marginBottom: 28,
      padding: 16,
      gap: 14,
    },
    dangerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dangerTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.error },
    dangerSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    deleteBtn: {
      backgroundColor: theme.colors.error,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    deleteBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  })
);
