import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { tr } from '../../app/translations';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';
import {
  createTeamTask,
  getTeamTask,
  listProperties,
  listTeamMembers,
  updateTeamTask,
} from '../../services/appApi';
import type { TeamMember, TeamTaskType } from '../../services/teamTypes';
import { hasFullEmployeeAccess } from '../../utils/employeeAccess';
import { TEAM_TASK_TYPE_OPTIONS } from '../../utils/teamPresentation';
import { CompactDatePicker } from './CompactDatePicker';

function combineDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function splitDateTime(value?: string | null) {
  if (!value) {
    return { date: '', time: '09:00' };
  }
  const iso = new Date(value);
  const date = iso.toISOString().slice(0, 10);
  const time = iso.toISOString().slice(11, 16);
  return { date, time };
}

export default function TeamTaskFormScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ taskId?: string; assigneeId?: string }>();
  const { userData } = useUserData();
  const isManager = userData?.role === 'agent' || hasFullEmployeeAccess(userData);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  const [taskType, setTaskType] = useState<TeamTaskType>('property_showing');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [repeatEnabled, setRepeatEnabled] = useState(false);

  const isShowing = taskType === 'property_showing';
  const editing = !!params.taskId;

  const loadData = useCallback(async () => {
    if (!isManager) {
      router.replace('/agent/team?tab=tasks' as never);
      return;
    }

    try {
      const [memberResponse, propertyResponse] = await Promise.all([
        listTeamMembers(),
        listProperties(),
      ]);
      setEmployees((memberResponse.members || []).filter((member: TeamMember) => member.role === 'employee'));
      setProperties(propertyResponse.properties || []);

      if (params.taskId) {
        const task = await getTeamTask(params.taskId);
        const next = splitDateTime(task.scheduled_at);
        setTaskType(task.task_type);
        setTitle(task.title || '');
        setDescription(task.description || '');
        setAssigneeId(task.assignee_id || '');
        setPropertyId(task.property_id || '');
        setCustomerName(task.customer_name || '');
        setCustomerPhone(task.customer_phone || '');
        setDate(next.date);
        setTime(next.time);
        setRepeatEnabled(!!task.repeat_enabled);
      } else {
        setAssigneeId(params.assigneeId || '');
        const today = new Date().toISOString().slice(0, 10);
        setDate(today);
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Görev formu yüklenemedi.');
      router.replace('/agent/team?tab=tasks' as never);
    } finally {
      setLoading(false);
    }
  }, [isManager, params.assigneeId, params.taskId]);

  useEffect(() => { loadData(); }, [loadData]);

  const canSubmit = useMemo(() => {
    if (!title.trim() || !assigneeId || !date || !time) return false;
    if (isShowing && (!propertyId || !customerName.trim() || !customerPhone.trim())) return false;
    return true;
  }, [assigneeId, customerName, customerPhone, date, isShowing, propertyId, time, title]);

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      const payload = {
        assignee_id: assigneeId,
        task_type: taskType,
        title: title.trim(),
        description: description.trim() || null,
        property_id: isShowing ? propertyId : null,
        customer_name: isShowing ? customerName.trim() : null,
        customer_phone: isShowing ? customerPhone.trim() : null,
        scheduled_at: combineDateTime(date, time),
        repeat_enabled: repeatEnabled,
      };
      if (editing && params.taskId) {
        await updateTeamTask(params.taskId, payload);
      } else {
        await createTeamTask(payload);
      }
      router.replace('/agent/team?tab=tasks' as never);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Görev kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? tr.team.taskForm.editTitle : tr.team.taskForm.createTitle}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{tr.team.taskForm.taskTypeTitle}</Text>
        <View style={styles.chipGrid}>
          {TEAM_TASK_TYPE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.chip, taskType === option.key && styles.chipActive]}
              onPress={() => setTaskType(option.key)}
            >
              <MaterialIcons name={option.icon as never} size={18} color={taskType === option.key ? theme.colors.textInverse : theme.colors.primary} />
              <Text style={[styles.chipText, taskType === option.key && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{tr.team.taskForm.basicInfoTitle}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={tr.team.taskForm.titlePlaceholder} placeholderTextColor={theme.colors.textMuted} />
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder={tr.team.taskForm.descriptionPlaceholder} placeholderTextColor={theme.colors.textMuted} multiline numberOfLines={4} />

        <Text style={styles.sectionTitle}>{tr.team.taskForm.assigneeTitle}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {employees.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={[styles.chip, assigneeId === member.id && styles.chipActive]}
              onPress={() => setAssigneeId(member.id)}
            >
              <Text style={[styles.chipText, assigneeId === member.id && styles.chipTextActive]}>{member.full_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>{tr.team.taskForm.scheduleTitle}</Text>
        <TouchableOpacity style={styles.input} onPress={() => setDatePickerVisible(true)}>
          <Text style={styles.inputText}>{date || tr.team.taskForm.datePlaceholder}</Text>
        </TouchableOpacity>
        <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="09:00" placeholderTextColor={theme.colors.textMuted} />

        {isShowing && (
          <>
            <Text style={styles.sectionTitle}>{tr.team.taskForm.showingTitle}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {properties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={[styles.chip, propertyId === property.id && styles.chipActive]}
                  onPress={() => setPropertyId(property.id)}
                >
                  <Text style={[styles.chipText, propertyId === property.id && styles.chipTextActive]}>
                    {property.address || property.description || 'Mulk'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder={tr.team.taskForm.customerNamePlaceholder} placeholderTextColor={theme.colors.textMuted} />
            <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} placeholder={tr.team.taskForm.customerPhonePlaceholder} placeholderTextColor={theme.colors.textMuted} />
          </>
        )}

        <View style={styles.switchRow}>
          <Text style={styles.sectionTitle}>{tr.team.taskForm.repeatLabel}</Text>
          <Switch value={repeatEnabled} onValueChange={setRepeatEnabled} />
        </View>

        <TouchableOpacity style={[styles.submitBtn, !canSubmit && { opacity: 0.5 }]} onPress={submit} disabled={!canSubmit || saving}>
          {saving ? <ActivityIndicator size="small" color={theme.colors.textInverse} /> : <Text style={styles.submitText}>{editing ? tr.team.taskForm.updateAction : tr.team.taskForm.createAction}</Text>}
        </TouchableOpacity>
      </ScrollView>

      <CompactDatePicker visible={datePickerVisible} onClose={() => setDatePickerVisible(false)} onSelect={setDate} currentValue={date} />
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface2, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 120 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
    input: { borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, paddingVertical: 14, color: theme.colors.textPrimary, fontSize: 14 },
    inputText: { fontSize: 14, color: theme.colors.textPrimary },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipRow: { gap: 8, paddingRight: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    chipText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
    chipTextActive: { color: theme.colors.textInverse },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
    submitBtn: { minHeight: 52, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    submitText: { fontSize: 14, fontWeight: '700', color: theme.colors.textInverse },
  })
);
