import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import {
  AdminDevUser,
  AdminDevUserRole,
  linkAdminDevUser,
  listAdminDevAgents,
  listAdminDevUsers,
} from '../../services/appApi';
import { createThemedStyles, useAppTheme } from '../theme';

type Status = 'pending' | 'active';

const ROLE_LABELS: Record<AdminDevUserRole, string> = {
  agent: 'Agent',
  landlord: 'Ev sahibi',
  tenant: 'Kiracı',
  employee: 'Çalışan',
};

export default function AdminDevToolsScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const [users, setUsers] = useState<AdminDevUser[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState<AdminDevUserRole>('tenant');
  const [targetAgentId, setTargetAgentId] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [employeeAccess, setEmployeeAccess] = useState<'full' | 'limited'>('limited');
  const [status, setStatus] = useState<Status>('active');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [userResponse, agentResponse] = await Promise.all([
        listAdminDevUsers(),
        listAdminDevAgents(),
      ]);
      setUsers(userResponse.users || []);
      setAgents(agentResponse.agents || []);
      setAgencies(agentResponse.agencies || []);
      if (!selectedUserId && userResponse.users?.[0]) {
        const first = userResponse.users[0];
        setSelectedUserId(first.id);
        setRole(first.role);
        setStatus(first.status || 'active');
        setTargetAgentId(first.created_by || '');
        setAgencyId(first.agency_id || '');
        setEmployeeAccess(first.employee_access_level === 'full' ? 'full' : 'limited');
      }
    } catch (error: any) {
      Alert.alert('Hata', error?.detail || error?.message || 'Dev kullanıcılar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    setRole(selectedUser.role);
    setStatus(selectedUser.status || 'active');
    setTargetAgentId(selectedUser.created_by || '');
    setAgencyId(selectedUser.agency_id || '');
    setEmployeeAccess(selectedUser.employee_access_level === 'full' ? 'full' : 'limited');
  }, [selectedUser]);

  const handleSave = async () => {
    if (!selectedUserId) {
      Alert.alert('Hata', 'Kullanıcı seçin.');
      return;
    }
    if (role !== 'agent' && !targetAgentId) {
      Alert.alert('Hata', 'Tenant, landlord ve çalışan için agent seçin.');
      return;
    }

    setSaving(true);
    try {
      await linkAdminDevUser({
        user_id: selectedUserId,
        role,
        status,
        target_agent_id: role === 'agent' ? null : targetAgentId,
        agency_id: role === 'agent' ? agencyId || null : null,
        employee_access_level: role === 'employee' ? employeeAccess : null,
      });
      Alert.alert('Kaydedildi', 'Kullanıcı bağlantısı güncellendi.');
      await load();
    } catch (error: any) {
      Alert.alert('Hata', error?.detail || error?.message || 'Kullanici baglanamadi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="construct-outline" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Gelistirme Araclari</Text>
          <Text style={styles.subtitle}>
            Supabase&apos;de manuel olusan kullanicilari test icin role ve agent altina baglayin.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Kullanici</Text>
          <Picker selectedValue={selectedUserId} onValueChange={(value) => setSelectedUserId(String(value))}>
            {users.map((user) => (
              <Picker.Item
                key={user.id}
                label={`${user.full_name || user.email} - ${ROLE_LABELS[user.role] || user.role}`}
                value={user.id}
              />
            ))}
          </Picker>
          {selectedUser ? (
            <Text style={styles.metaText}>{selectedUser.email}</Text>
          ) : (
            <Text style={styles.metaText}>Bağlanabilecek kullanıcı bulunamadı.</Text>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Rol</Text>
          <Picker selectedValue={role} onValueChange={(value) => setRole(value as AdminDevUserRole)}>
            <Picker.Item label="Tenant / Kiracı" value="tenant" />
            <Picker.Item label="Landlord / Ev sahibi" value="landlord" />
            <Picker.Item label="Employee / Çalışan" value="employee" />
            <Picker.Item label="Agent" value="agent" />
          </Picker>
        </View>

        {role === 'agent' ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Agent firma/ofis bağlantısı</Text>
            <Picker selectedValue={agencyId} onValueChange={(value) => setAgencyId(String(value))}>
              <Picker.Item label="Bağımsız agent" value="" />
              {agencies.map((agency) => (
                <Picker.Item
                  key={agency.id}
                  label={`${agency.name} - ${agency.entity_type === 'company' ? 'Şirket' : 'Ofis'}`}
                  value={agency.id}
                />
              ))}
            </Picker>
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Altına bağlanacak agent</Text>
            <Picker selectedValue={targetAgentId} onValueChange={(value) => setTargetAgentId(String(value))}>
              <Picker.Item label="Agent seçin" value="" />
              {agents.map((agent) => (
                <Picker.Item
                  key={agent.id}
                  label={`${agent.full_name || agent.email}${agent.agencies?.name ? ` - ${agent.agencies.name}` : ''}`}
                  value={agent.id}
                />
              ))}
            </Picker>
          </View>
        )}

        {role === 'employee' ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Çalışan yetkisi</Text>
            <Picker selectedValue={employeeAccess} onValueChange={(value) => setEmployeeAccess(value as 'full' | 'limited')}>
              <Picker.Item label="Sınırlı" value="limited" />
              <Picker.Item label="Tam yetkili" value="full" />
            </Picker>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Durum</Text>
          <Picker selectedValue={status} onValueChange={(value) => setStatus(value as Status)}>
            <Picker.Item label="Aktif" value="active" />
            <Picker.Item label="Onay bekliyor" value="pending" />
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.saveText}>Bağlantıyı kaydet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { padding: theme.spacing.lg, paddingBottom: 110, gap: theme.spacing.md },
    header: { gap: theme.spacing.sm },
    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary },
    subtitle: { fontSize: theme.fontSize.sm, lineHeight: 20, color: theme.colors.textSecondary },
    panel: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      paddingTop: theme.spacing.md,
    },
    sectionTitle: {
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    metaText: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    saveButton: {
      minHeight: 56,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
    },
    saveText: { color: theme.colors.textInverse, fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.bold },
    disabled: { opacity: 0.6 },
  })
);
