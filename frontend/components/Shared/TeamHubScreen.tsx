import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '../../app/translations';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';
import {
  createTeamAnnouncement,
  deleteTeamTask,
  getTeamTask,
  listExpenses,
  listTeamAnnouncements,
  listMeetings,
  listTeamMessages,
  listTeamMembers,
  listTeamTasks,
  markAnnouncementRead,
  remindAnnouncement,
  transitionTeamTask,
} from '../../services/appApi';
import type {
  OfficeExpense,
  TeamAnnouncement,
  TeamMeeting,
  TeamMember,
  TeamMessage,
  TeamTab,
  TeamTask,
} from '../../services/teamTypes';
import {
  removeFilesFromSupabaseStorage,
  resolveSupabaseStorageUrl,
  uploadFileToSupabaseStorage,
} from '../../services/supabaseStorage';
import { prepareUploadAsset } from '../../services/uploadPreparation';
import { hasFullEmployeeAccess } from '../../utils/employeeAccess';
import {
  formatLongDate,
  formatTaskDateTime,
  getAnnouncementAudienceLabel,
  getTaskTone,
  getTaskTypeMeta,
  TEAM_TAB_LABELS,
  TEAM_TASK_FILTER_LABELS,
} from '../../utils/teamPresentation';
import LocationPicker from './LocationPicker';
import TaskComposerSheet from './TaskComposerSheet';
import TeamExpensesPanel from './TeamExpensesPanel';
import TeamMeetingsPanel from './TeamMeetingsPanel';
import { useGlobalBottomNavInset } from './AppBottomNav';

type AnnouncementAttachmentDraft = {
  uri: string;
  mimeType: string;
  name: string;
  kind: 'image' | 'document' | 'file';
};

type TaskFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

function normalizeTab(tab?: string, canSeeReport = false): TeamTab {
  if (tab === 'tasks' || tab === 'announcements' || tab === 'meetings' || tab === 'expenses') return tab;
  if (tab === 'report' && canSeeReport) return 'report';
  return 'tasks';
}

export default function TeamHubScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const bottomNavInset = useGlobalBottomNavInset();
  const params = useLocalSearchParams<{
    tab?: string;
    openTaskId?: string;
    composeTask?: string;
    taskId?: string;
    assigneeId?: string;
  }>();
  const { userData, loading: userLoading } = useUserData();

  const isManager = userData?.role === 'agent' || hasFullEmployeeAccess(userData);
  const canSeeReport = isManager;
  const [activeTab, setActiveTab] = useState<TeamTab>(() => normalizeTab(params.tab, canSeeReport));

  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [announcements, setAnnouncements] = useState<TeamAnnouncement[]>([]);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [meetingsList, setMeetingsList] = useState<TeamMeeting[]>([]);
  const [expensesList, setExpensesList] = useState<OfficeExpense[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [taskModalLoading, setTaskModalLoading] = useState(false);
  const [taskModalSubmitting, setTaskModalSubmitting] = useState(false);
  const [taskActionNote, setTaskActionNote] = useState('');
  const [taskActionPhotos, setTaskActionPhotos] = useState<string[]>([]);
  const [taskComposerVisible, setTaskComposerVisible] = useState(false);
  const [taskComposerTaskId, setTaskComposerTaskId] = useState<string | null>(null);
  const [taskComposerAssigneeId, setTaskComposerAssigneeId] = useState<string | null>(null);

  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);
  const [employeeFullName, setEmployeeFullName] = useState('');
  const [employeeIdentifier, setEmployeeIdentifier] = useState('');
  const [employeePhone, setEmployeePhone] = useState('');
  const [employeeCity, setEmployeeCity] = useState('');
  const [employeeDistrict, setEmployeeDistrict] = useState('');
  const [employeeAccessLevel, setEmployeeAccessLevel] = useState<'full' | 'limited'>('limited');

  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [announcementAttachment, setAnnouncementAttachment] = useState<AnnouncementAttachmentDraft | null>(null);

  const announcementRecipients = useMemo(() => members, [members]);
  const summary = useMemo(() => {
    const today = new Date().toDateString();
    return {
      memberCount: members.length,
      openTasks: tasks.filter((task) => ['pending', 'in_progress'].includes(task.status)).length,
      unreadAnnouncements: announcements.filter((item) => !item.viewer_is_read).length,
      todayMeetings: meetingsList.filter((m) => {
        if (m.status !== 'scheduled') return false;
        try { return new Date(m.scheduled_at).toDateString() === today; } catch { return false; }
      }).length,
    };
  }, [announcements, members.length, tasks, meetingsList]);
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (taskFilter === 'all') return true;
      if (taskFilter === 'overdue') return getTaskTone(theme, task).label === tr.team.taskStatuses.overdue;
      return task.status === taskFilter;
    });
  }, [taskFilter, tasks, theme]);

  const loadMembers = useCallback(async () => {
    try {
      setMembersLoading(true);
      setMembersError(null);
      const memberResponse = await listTeamMembers();
      setMembers(memberResponse.members || []);
    } catch (error: any) {
      setMembersError(error.message || 'Ofis rosteri yuklenemedi.');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      setTasksError(null);
      const taskResponse = await listTeamTasks();
      setTasks(taskResponse.tasks || []);
    } catch (error: any) {
      setTasksError(error.message || 'Görev akışı yüklenemedi.');
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      setAnnouncementsLoading(true);
      setAnnouncementsError(null);
      const announcementResponse = await listTeamAnnouncements();
      setAnnouncements(announcementResponse.announcements || []);
    } catch (error: any) {
      setAnnouncementsError(error.message || 'Duyurular yuklenemedi.');
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setMessagesLoading(true);
      setMessagesError(null);
      const messageResponse = await listTeamMessages();
      setMessages(messageResponse.messages || []);
    } catch (error: any) {
      setMessagesError(error.message || tr.team.messages.errorTitle);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const loadMeetings = useCallback(async () => {
    try {
      setMeetingsLoading(true);
      setMeetingsError(null);
      const response = await listMeetings();
      setMeetingsList(response.meetings || []);
    } catch (error: any) {
      setMeetingsError(error.message || 'Toplantılar yüklenemedi.');
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      setExpensesLoading(true);
      setExpensesError(null);
      const response = await listExpenses();
      setExpensesList(response.expenses || []);
    } catch (error: any) {
      setExpensesError(error.message || 'Harcamalar yüklenemedi.');
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  const loadHubData = useCallback(async () => {
    await Promise.allSettled([
      loadMembers(),
      loadTasks(),
      loadAnnouncements(),
      loadMessages(),
      loadMeetings(),
      loadExpenses(),
    ]);
  }, [loadAnnouncements, loadMembers, loadMessages, loadTasks, loadMeetings, loadExpenses]);

  useFocusEffect(
    useCallback(() => {
      if (!userLoading && userData?.id) {
        loadHubData();
      }
    }, [loadHubData, userData?.id, userLoading])
  );

  useEffect(() => {
    if (!userLoading && !userData?.id) {
      setMembersLoading(false);
      setTasksLoading(false);
      setAnnouncementsLoading(false);
      setMessagesLoading(false);
      setMeetingsLoading(false);
      setExpensesLoading(false);
    }
  }, [userData?.id, userLoading]);

  useEffect(() => {
    if (params.openTaskId && typeof params.openTaskId === 'string') {
      setSelectedTaskId(params.openTaskId);
    }
  }, [params.openTaskId]);

  useEffect(() => {
    if (params.composeTask !== '1') {
      return;
    }

    setActiveTab('tasks');
    setTaskComposerTaskId(typeof params.taskId === 'string' ? params.taskId : null);
    setTaskComposerAssigneeId(typeof params.assigneeId === 'string' ? params.assigneeId : null);
    setTaskComposerVisible(true);
  }, [params.assigneeId, params.composeTask, params.taskId]);

  useEffect(() => {
    setSelectedRecipients((prev) => prev.filter((memberId) => members.some((member) => member.id === memberId)));
  }, [members]);

  useEffect(() => {
    const loadTask = async () => {
      if (!selectedTaskId) {
        setSelectedTask(null);
        return;
      }
      try {
        setTaskModalLoading(true);
        setSelectedTask(await getTeamTask(selectedTaskId));
      } catch (error: any) {
        Alert.alert('Hata', error.message || 'Görev detayı yüklenemedi.');
        setSelectedTaskId(null);
      } finally {
        setTaskModalLoading(false);
      }
    };
    loadTask();
  }, [selectedTaskId]);

  useEffect(() => {
    if (params.tab) setActiveTab(normalizeTab(params.tab, canSeeReport));
  }, [canSeeReport, params.tab]);

  const openTab = (tab: TeamTab) => setActiveTab(tab);
  const onRefresh = () => {
    setRefreshing(true);
    void loadHubData().finally(() => setRefreshing(false));
  };

  const closeTaskModal = () => {
    setSelectedTaskId(null);
    setSelectedTask(null);
    setTaskActionNote('');
    setTaskActionPhotos([]);
    if (params.openTaskId) {
      router.replace(`/agent/team?tab=${activeTab}` as never);
    }
  };

  const openTaskComposer = (options?: { taskId?: string | null; assigneeId?: string | null }) => {
    setTaskComposerTaskId(options?.taskId || null);
    setTaskComposerAssigneeId(options?.assigneeId || null);
    setTaskComposerVisible(true);
  };

  const resetEmployeeForm = () => {
    setEmployeeFullName('');
    setEmployeeIdentifier('');
    setEmployeePhone('');
    setEmployeeCity('');
    setEmployeeDistrict('');
    setEmployeeAccessLevel('limited');
  };

  const closeEmployeeModal = () => {
    if (employeeSubmitting) return;
    setEmployeeModalVisible(false);
    resetEmployeeForm();
  };

  const closeTaskComposer = () => {
    setTaskComposerVisible(false);
    setTaskComposerTaskId(null);
    setTaskComposerAssigneeId(null);

    if (params.composeTask === '1') {
      router.replace('/agent/team?tab=tasks' as never);
    }
  };

  const toggleRecipient = (memberId: string) => {
    setSelectedRecipients((prev) => prev.includes(memberId) ? prev.filter((item) => item !== memberId) : [...prev, memberId]);
  };

  const submitEmployee = async () => {
    if (!employeeFullName.trim() || !employeeIdentifier.trim()) {
      Alert.alert('Eksik Bilgi', 'Ad soyad ve e-posta/telefon zorunludur.');
      return;
    }
    if (!employeeCity.trim() || !employeeDistrict.trim()) {
      Alert.alert('Eksik Bilgi', 'Şehir ve ilçe seçimi zorunludur.');
      return;
    }

    try {
      setEmployeeSubmitting(true);

      const trimmedIdentifier = employeeIdentifier.trim();
      const resolvedEmail = trimmedIdentifier.includes('@')
        ? trimmedIdentifier.toLowerCase()
        : `${trimmedIdentifier.replace(/\D/g, '')}@emlak-user.local`;
      const resolvedPhone = trimmedIdentifier.includes('@')
        ? (employeePhone.trim() || null)
        : trimmedIdentifier;

      await Promise.resolve();
      router.push(`/agent/invite?role=employee&name=${encodeURIComponent(employeeFullName.trim())}&phone=${encodeURIComponent(resolvedPhone || '')}&email=${encodeURIComponent(resolvedEmail)}&access=${employeeAccessLevel}` as never);

      setEmployeeModalVisible(false);
      resetEmployeeForm();
      Alert.alert('Davet akışı açıldı', 'Çalışan artık tek Davet Et ekranından davet ediliyor.');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Davet ekranı açılamadı.');
    } finally {
      setEmployeeSubmitting(false);
    }
  };

  const pickAnnouncementImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAnnouncementAttachment({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `announcement-${Date.now()}.jpg`,
        kind: 'image',
      });
    }
  };

  const pickAnnouncementDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', '*/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'application/octet-stream';
      setAnnouncementAttachment({
        uri: asset.uri,
        mimeType,
        name: asset.name || `announcement-${Date.now()}`,
        kind: mimeType.startsWith('image/') ? 'image' : mimeType.includes('pdf') ? 'document' : 'file',
      });
    }
  };

  const submitAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      Alert.alert('Eksik Bilgi', 'Başlık ve içerik zorunludur.');
      return;
    }
    if (!sendToAll && selectedRecipients.length === 0) {
      Alert.alert('Eksik Bilgi', 'En az bir alıcı seçin.');
      return;
    }

    try {
      setAnnouncementSubmitting(true);
      let attachmentPath: string | null = null;
      let attachmentKind: AnnouncementAttachmentDraft['kind'] | null = null;

      if (announcementAttachment) {
        const officeOwnerId = userData?.role === 'employee'
          ? userData.created_by
          : userData?.id;
        if (!officeOwnerId || !userData?.id) {
          throw new Error('Ofis bilgisi bulunamadi.');
        }
        const preparedAttachment = await prepareUploadAsset({
          uri: announcementAttachment.uri,
          name: announcementAttachment.name,
          mimeType: announcementAttachment.mimeType,
        });
        const ext = preparedAttachment.name.includes('.') ? preparedAttachment.name.split('.').pop() : 'bin';
        const upload = await uploadFileToSupabaseStorage({
          bucket: 'announcement-files',
          path: `${officeOwnerId}/${userData.id}/${Date.now()}.${ext}`,
          fileUri: preparedAttachment.uri,
          contentType: preparedAttachment.mimeType,
        });
        attachmentPath = upload.path;
        attachmentKind = announcementAttachment.kind;
      }

      try {
        await createTeamAnnouncement({
          title: announcementTitle.trim(),
          body: announcementBody.trim(),
          send_to_all: sendToAll,
          recipient_ids: sendToAll ? [] : selectedRecipients,
          attachment_path: attachmentPath,
          attachment_kind: attachmentKind,
        });
      } catch (error) {
        await removeFilesFromSupabaseStorage('announcement-files', [attachmentPath]).catch(() => {});
        throw error;
      }

      setAnnouncementModalVisible(false);
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setSendToAll(true);
      setSelectedRecipients([]);
      setAnnouncementAttachment(null);
      await loadHubData();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Duyuru oluşturulamadı.');
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  const markRead = async (announcementId: string) => {
    try {
      await markAnnouncementRead(announcementId);
      await loadHubData();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Duyuru okundu olarak işaretlenemedi.');
    }
  };

  const remindUnreadUsers = async (announcementId: string) => {
    try {
      const response = await remindAnnouncement(announcementId);
      Alert.alert('Hatırlatma Gönderildi', `${response.reminded_count} kişiye hatırlatma gitti.`);
      await loadHubData();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Hatırlatma gönderilemedi.');
    }
  };

  const openAnnouncementAttachment = async (announcement: TeamAnnouncement) => {
    const url = resolveSupabaseStorageUrl('announcement-files', announcement.attachment_path);
    if (!url) {
      Alert.alert('Dosya Açılamadı', 'Duyuru eki için geçerli bir bağlantı bulunamadı.');
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Dosya Açılamadı', 'Ek dosya şu anda açılamıyor.');
    }
  };


  const pickTaskPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      setTaskActionPhotos((prev) => [...prev, ...result.assets.map((asset) => asset.uri)].slice(0, 5));
    }
  };

  const uploadTaskPhotos = async (taskId: string) => {
    const uploads: string[] = [];
    try {
      for (let index = 0; index < taskActionPhotos.length; index += 1) {
        const preparedPhoto = await prepareUploadAsset({
          uri: taskActionPhotos[index],
          name: `task-${taskId}-${index}.jpg`,
          mimeType: 'image/jpeg',
        });
        const upload = await uploadFileToSupabaseStorage({
          bucket: 'task-photos',
          path: `${taskId}/${Date.now()}-${index}.jpg`,
          fileUri: preparedPhoto.uri,
          contentType: preparedPhoto.mimeType,
        });
        uploads.push(upload.path);
      }
      return uploads;
    } catch (error) {
      await removeFilesFromSupabaseStorage('task-photos', uploads).catch(() => {});
      throw error;
    }
  };

  const handleTaskTransition = async (action: 'start' | 'complete' | 'cancel') => {
    if (!selectedTask) return;
    try {
      setTaskModalSubmitting(true);
      const photoUrls = action === 'complete' ? await uploadTaskPhotos(selectedTask.id) : [];
      await transitionTeamTask(selectedTask.id, {
        action,
        note: taskActionNote.trim() || undefined,
        photo_urls: photoUrls,
      });
      closeTaskModal();
      await loadHubData();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Görev durumu güncellenemedi.');
    } finally {
      setTaskModalSubmitting(false);
    }
  };

  const handleDeleteTask = () => {
    if (!selectedTask || taskModalSubmitting) return;
    Alert.alert(
      'Görevi kalıcı sil',
      'Yanlış eklenen tamamlanmamış görev kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setTaskModalSubmitting(true);
              await deleteTeamTask(selectedTask.id);
              closeTaskModal();
              await loadTasks();
            } catch (error: any) {
              Alert.alert('Görev silinemedi', error?.detail || error?.message || 'Lütfen tekrar deneyin.');
            } finally {
              setTaskModalSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const visibleTabs: TeamTab[] = ['tasks', 'announcements', 'meetings', 'expenses'];

  const renderSectionStateCard = ({
    icon,
    title,
    description,
    actionLabel,
    onAction,
  }: {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <View style={styles.stateCard}>
      <MaterialIcons name={icon} size={34} color={theme.colors.textMuted} />
      <Text style={styles.stateCardTitle}>{title}</Text>
      <Text style={styles.stateCardText}>{description}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.secondaryAction} onPress={onAction}>
          <MaterialIcons name="refresh" size={16} color={theme.colors.primary} />
          <Text style={styles.secondaryActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (userLoading || (!!userData?.id && membersLoading && !members.length && !membersError)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16 + insets.top, paddingBottom: bottomNavInset }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Ekibim</Text>
          </View>
          <TouchableOpacity
            style={styles.msgIconBtn}
            onPress={() => router.push('/agent/team-messages' as never)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="chat-bubble-outline" size={22} color={theme.colors.primary} />
            {messages.length > 0 && (
              <View style={styles.msgBadge} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Hero card (compact) ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroEyebrow}>OFİS ALANI</Text>
            <Text style={styles.heroTitle}>Takım nabzı tek yerde</Text>
          </View>

          {/* Compact inline stats */}
          <View style={styles.compactStatsRow}>
            <View style={styles.compactStat}>
              <MaterialIcons name="group" size={14} color={theme.colors.textMuted} />
              <Text style={styles.compactStatText}>{summary.memberCount} üye</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.compactStat}>
              <MaterialIcons name="task-alt" size={14} color={theme.colors.textMuted} />
              <Text style={styles.compactStatText}>{summary.openTasks} açık görev</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.compactStat}>
              <MaterialIcons name="notifications-none" size={14} color={theme.colors.textMuted} />
              <Text style={styles.compactStatText}>{summary.unreadAnnouncements} okunmayan</Text>
            </View>
          </View>

          {/* Context hints — only shown when relevant */}
          <View style={styles.hintsList}>
            {summary.todayMeetings > 0 && (
              <View style={styles.hintRow}>
                <View style={[styles.hintDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.hintText}>
                  Bugün <Text style={styles.hintBold}>{summary.todayMeetings} toplantı</Text> planlandı
                </Text>
              </View>
            )}
            {summary.openTasks > 0 && (
              <View style={styles.hintRow}>
                <View style={[styles.hintDot, { backgroundColor: theme.colors.warning }]} />
                <Text style={styles.hintText}>
                  <Text style={styles.hintBold}>{summary.openTasks} görev</Text> tamamlanmayı bekliyor
                </Text>
              </View>
            )}
            {summary.unreadAnnouncements > 0 && (
              <View style={styles.hintRow}>
                <View style={[styles.hintDot, { backgroundColor: theme.colors.error }]} />
                <Text style={styles.hintText}>
                  <Text style={styles.hintBold}>{summary.unreadAnnouncements} duyuru</Text> okunmadı
                </Text>
              </View>
            )}
            {summary.todayMeetings === 0 && summary.openTasks === 0 && summary.unreadAnnouncements === 0 && (
              <View style={styles.hintRow}>
                <View style={[styles.hintDot, { backgroundColor: theme.colors.success }]} />
                <Text style={styles.hintText}>Bugün her şey yolunda</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Tab bar (eşit dağılımlı satır, icon + label) ── */}
        <View style={styles.tabScrollView}>
          {visibleTabs.map((tab, index) => {
            const active = activeTab === tab;
            const isLast = index === visibleTabs.length - 1;
            const tabIcon: Record<string, keyof typeof MaterialIcons.glyphMap> = {
              tasks: 'task-alt',
              announcements: 'campaign',
              meetings: 'event',
              expenses: 'receipt-long',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabItem,
                  isLast && styles.tabItemLast,
                  active && styles.tabItemActive,
                ]}
                onPress={() => openTab(tab)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={tabIcon[tab] ?? 'circle'}
                  size={20}
                  color={active ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text style={[styles.tabItemText, active && styles.tabItemTextActive]}>
                  {TEAM_TAB_LABELS[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>


        {activeTab === 'tasks' && (
          <View style={styles.sectionStack}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Görev Akışı</Text>
                <Text style={styles.sectionSubtitle}>{isManager ? 'Tüm ofis görevleri.' : 'Sadece size atanan görevler.'}</Text>
              </View>
              {isManager && (
                <TouchableOpacity style={styles.primaryAction} onPress={() => openTaskComposer()}>
                  <MaterialIcons name="add" size={18} color={theme.colors.textInverse} />
                  <Text style={styles.primaryActionText}>Yeni Görev</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(Object.keys(TEAM_TASK_FILTER_LABELS) as TaskFilter[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, taskFilter === filter && styles.filterChipActive]}
                  onPress={() => setTaskFilter(filter)}
                >
                  <Text style={[styles.filterChipText, taskFilter === filter && styles.filterChipTextActive]}>
                    {TEAM_TASK_FILTER_LABELS[filter]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {tasksError && tasks.length > 0 && (
              <View style={styles.inlineWarning}>
                <MaterialIcons name="error-outline" size={18} color={theme.colors.warningText} />
                <Text style={styles.inlineWarningText}>Görev listesi yenilenemedi. Son başarılı veri gösteriliyor.</Text>
              </View>
            )}
            {tasksLoading && tasks.length === 0 ? (
              renderSectionStateCard({
                icon: 'task-alt',
                title: 'Görevler yükleniyor',
                description: 'Ofis görev akışı hazırlanıyor.',
              })
            ) : tasksError && tasks.length === 0 ? (
              renderSectionStateCard({
                icon: 'task-alt',
                title: 'Görevleri yükleyemedik',
                description: tasksError,
                actionLabel: 'Tekrar dene',
                onAction: loadTasks,
              })
            ) : filteredTasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="task-alt" size={36} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>Görev bulunamadı</Text>
              </View>
            ) : (
              filteredTasks.map((task) => {
                const typeMeta = getTaskTypeMeta(task.task_type);
                const tone = getTaskTone(theme, task);
                return (
                  <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => setSelectedTaskId(task.id)} activeOpacity={0.88}>
                    <View style={styles.taskHeader}>
                      <View style={styles.taskIconBox}>
                        <MaterialIcons name={typeMeta.icon as never} size={20} color={theme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <Text style={styles.taskMeta}>{typeMeta.label}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
                        <Text style={[styles.statusPillText, { color: tone.textColor }]}>{tone.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.taskInfo}>Atanan: {task.assignee_name || 'Atanmadi'}</Text>
                    <Text style={styles.taskInfo}>Tarih: {formatTaskDateTime(task.scheduled_at)}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'announcements' && (
          <View style={styles.sectionStack}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Duyurular</Text>
                <Text style={styles.sectionSubtitle}>{isManager ? 'Tüm ekip veya seçili kişilere gönderin.' : 'Size gelen ekip duyuruları.'}</Text>
              </View>
              {isManager && (
                <TouchableOpacity style={styles.primaryAction} onPress={() => setAnnouncementModalVisible(true)}>
                  <MaterialIcons name="campaign" size={18} color={theme.colors.textInverse} />
                  <Text style={styles.primaryActionText}>Oluştur</Text>
                </TouchableOpacity>
              )}
            </View>
            {announcementsError && announcements.length > 0 && (
              <View style={styles.inlineWarning}>
                <MaterialIcons name="error-outline" size={18} color={theme.colors.warningText} />
                <Text style={styles.inlineWarningText}>Duyurular yenilenemedi. Son başarılı veri gösteriliyor.</Text>
              </View>
            )}
            {announcementsLoading && announcements.length === 0 ? (
              renderSectionStateCard({
                icon: 'campaign',
                title: 'Duyurular yükleniyor',
                description: 'Son ekip duyuruları getiriliyor.',
              })
            ) : announcementsError && announcements.length === 0 ? (
              renderSectionStateCard({
                icon: 'campaign',
                title: 'Duyuruları yükleyemedik',
                description: announcementsError,
                actionLabel: 'Tekrar dene',
                onAction: loadAnnouncements,
              })
            ) : announcements.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="campaign" size={36} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>Duyuru bulunamadı</Text>
              </View>
            ) : (
              announcements.map((announcement) => (
                <View key={announcement.id} style={styles.announcementCard}>
                  <Text style={styles.announcementTitle}>{announcement.title}</Text>
                  <Text style={styles.announcementMeta}>
                    {announcement.creator_name || 'Sistem'} | {formatLongDate(announcement.created_at)}
                  </Text>
                  <Text style={styles.announcementBody}>{announcement.body}</Text>
                  <Text style={styles.announcementAudience}>{getAnnouncementAudienceLabel(announcement)}</Text>
                  {!!announcement.attachment_path && (
                    <TouchableOpacity style={styles.attachmentAction} onPress={() => openAnnouncementAttachment(announcement)}>
                      <MaterialIcons
                        name={announcement.attachment_kind === 'image' ? 'image' : 'attach-file'}
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.secondaryActionText}>Ek dosya</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.announcementFooter}>
                    <Text style={styles.announcementCounter}>{announcement.read_count}/{announcement.recipient_count} okundu</Text>
                    {isManager ? (
                      announcement.unread_count > 0 && (
                        <TouchableOpacity style={styles.secondaryAction} onPress={() => remindUnreadUsers(announcement.id)}>
                          <MaterialIcons name="notifications-active" size={16} color={theme.colors.primary} />
                          <Text style={styles.secondaryActionText}>Hatırlat</Text>
                        </TouchableOpacity>
                      )
                    ) : !announcement.viewer_is_read ? (
                      <TouchableOpacity style={styles.secondaryAction} onPress={() => markRead(announcement.id)}>
                        <MaterialIcons name="done-all" size={16} color={theme.colors.primary} />
                        <Text style={styles.secondaryActionText}>Okundu</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.readText}>Okundu</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'meetings' && (
          <TeamMeetingsPanel
            meetings={meetingsList}
            loading={meetingsLoading}
            error={meetingsError}
            isManager={isManager}
            onRefresh={() => void loadMeetings()}
          />
        )}

        {activeTab === 'expenses' && (
          <TeamExpensesPanel
            expenses={expensesList}
            loading={expensesLoading}
            error={expensesError}
            currentUserId={userData?.id}
            isAgent={userData?.role === 'agent'}
            onRefresh={() => void loadExpenses()}
          />
        )}

      </ScrollView>

      <Modal visible={employeeModalVisible} transparent animationType="slide" onRequestClose={closeEmployeeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeEmployeeModal}>
          <Pressable style={styles.sheetCard}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>Çalışan Ekle</Text>
                    <Text style={styles.sheetSubtitle}>Çalışan oluşturma ve silme yalnızca agent hesabında açıktır.</Text>
                  </View>
                  <TouchableOpacity onPress={closeEmployeeModal} disabled={employeeSubmitting}>
                    <MaterialIcons name="close" size={22} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ad soyad"
                  placeholderTextColor={theme.colors.textMuted}
                  value={employeeFullName}
                  onChangeText={setEmployeeFullName}
                />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="E-posta veya telefon"
                  placeholderTextColor={theme.colors.textMuted}
                  value={employeeIdentifier}
                  onChangeText={setEmployeeIdentifier}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Telefon (opsiyonel)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={employeePhone}
                  onChangeText={setEmployeePhone}
                  keyboardType="phone-pad"
                />

                <LocationPicker
                  province={employeeCity}
                  district={employeeDistrict}
                  onProvinceChange={setEmployeeCity}
                  onDistrictChange={setEmployeeDistrict}
                  required
                />

                <Text style={styles.switchLabel}>Çalışan Yetkisi</Text>
                <View style={styles.permissionRow}>
                  {([
                    { key: 'limited', label: 'Sinirli Yetki' },
                    { key: 'full', label: 'Tam Yetki' },
                  ] as const).map((option) => {
                    const selected = employeeAccessLevel === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[styles.permissionChip, selected && styles.permissionChipActive]}
                        onPress={() => setEmployeeAccessLevel(option.key)}
                        disabled={employeeSubmitting}
                      >
                        <Text style={[styles.permissionChipText, selected && styles.permissionChipTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.sheetSubtitle}>
                  {employeeAccessLevel === 'full'
                    ? 'Kiraci, ev sahibi ve mulk operasyonlarina erisebilir.'
                    : 'Yalnızca kendisine açık görev ve ekranları görür.'}
                </Text>

                <TouchableOpacity style={styles.primaryLarge} onPress={submitEmployee} disabled={employeeSubmitting}>
                  {employeeSubmitting ? (
                    <ActivityIndicator size="small" color={theme.colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryActionText}>Çalışanı Oluştur</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!selectedTaskId} transparent animationType="slide" onRequestClose={closeTaskModal}>
        <Pressable style={styles.modalOverlay} onPress={closeTaskModal}>
          <Pressable style={styles.sheetCard}>
            {taskModalLoading || !selectedTask ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 32 }} />
            ) : (
              <>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>{selectedTask.title}</Text>
                    <Text style={styles.sheetSubtitle}>{getTaskTypeMeta(selectedTask.task_type).label}</Text>
                  </View>
                  <TouchableOpacity onPress={closeTaskModal}>
                    <MaterialIcons name="close" size={22} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.sheetMeta}>Atanan: {selectedTask.assignee_name || '-'}</Text>
                <Text style={styles.sheetMeta}>Tarih: {formatTaskDateTime(selectedTask.scheduled_at)}</Text>
                {!!selectedTask.property_label && <Text style={styles.sheetMeta}>Mulk: {selectedTask.property_label}</Text>}
                {!!selectedTask.description && <Text style={styles.sheetBody}>{selectedTask.description}</Text>}
                {(selectedTask.status === 'pending' || selectedTask.status === 'in_progress') && (
                  <>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="Tamamlama notu veya aciklama"
                      placeholderTextColor={theme.colors.textMuted}
                      value={taskActionNote}
                      onChangeText={setTaskActionNote}
                      multiline
                      numberOfLines={4}
                    />
                    <View style={styles.sheetActionRow}>
                      <TouchableOpacity style={styles.secondaryAction} onPress={pickTaskPhotos}>
                        <MaterialIcons name="add-photo-alternate" size={16} color={theme.colors.primary} />
                        <Text style={styles.secondaryActionText}>Foto Ekle</Text>
                      </TouchableOpacity>
                      {!!taskActionPhotos.length && <Text style={styles.photoText}>{taskActionPhotos.length} foto secildi</Text>}
                    </View>
                  </>
                )}
                <View style={styles.sheetButtons}>
                  {isManager && ['pending', 'in_progress'].includes(selectedTask.status) && (
                    <TouchableOpacity
                      style={styles.secondaryLarge}
                      onPress={() => {
                        closeTaskModal();
                        openTaskComposer({ taskId: selectedTask.id });
                      }}
                    >
                      <MaterialIcons name="edit" size={16} color={theme.colors.primary} />
                      <Text style={styles.secondaryActionText}>Duzenle</Text>
                    </TouchableOpacity>
                  )}
                  {(isManager || selectedTask.assignee_id === userData?.id) && selectedTask.status === 'pending' && (
                    <TouchableOpacity style={styles.primaryLarge} onPress={() => handleTaskTransition('start')} disabled={taskModalSubmitting}>
                      <Text style={styles.primaryActionText}>Baslat</Text>
                    </TouchableOpacity>
                  )}
                  {selectedTask.assignee_id === userData?.id && selectedTask.status === 'in_progress' && (
                    <TouchableOpacity style={styles.successLarge} onPress={() => handleTaskTransition('complete')} disabled={taskModalSubmitting}>
                      <Text style={styles.primaryActionText}>Tamamla</Text>
                    </TouchableOpacity>
                  )}
                  {isManager && ['pending', 'in_progress'].includes(selectedTask.status) && (
                    <TouchableOpacity style={styles.cancelLarge} onPress={() => handleTaskTransition('cancel')} disabled={taskModalSubmitting}>
                      <Text style={styles.cancelText}>Iptal Et</Text>
                    </TouchableOpacity>
                  )}
                  {isManager && ['pending', 'in_progress', 'cancelled'].includes(selectedTask.status) && (
                    <TouchableOpacity style={styles.deleteLarge} onPress={handleDeleteTask} disabled={taskModalSubmitting}>
                      <MaterialIcons name="delete-forever" size={16} color={theme.colors.error} />
                      <Text style={styles.deleteText}>Kalıcı Sil</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <TaskComposerSheet
        visible={taskComposerVisible}
        onClose={closeTaskComposer}
        onSaved={loadHubData}
        taskId={taskComposerTaskId}
        initialAssigneeId={taskComposerAssigneeId}
        initialMembers={members}
      />

      <Modal visible={announcementModalVisible} transparent animationType="slide" onRequestClose={() => setAnnouncementModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAnnouncementModalVisible(false)}>
          <Pressable style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Duyuru Oluştur</Text>
                <Text style={styles.sheetSubtitle}>Tüm ekip veya seçili kişilere gönderilebilir.</Text>
              </View>
              <TouchableOpacity onPress={() => setAnnouncementModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.fieldInput}
              placeholder="Başlık"
              placeholderTextColor={theme.colors.textMuted}
              value={announcementTitle}
              onChangeText={setAnnouncementTitle}
            />
            <TextInput
              style={[styles.fieldInput, styles.bodyInput]}
              placeholder="Duyuru metni"
              placeholderTextColor={theme.colors.textMuted}
              value={announcementBody}
              onChangeText={setAnnouncementBody}
              multiline
              numberOfLines={5}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Tüm ekibe gönder</Text>
              <Switch
                value={sendToAll}
                onValueChange={setSendToAll}
                trackColor={{ false: '#D4D4D4', true: theme.colors.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D4D4D4"
              />
            </View>
            {!sendToAll && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {announcementRecipients.map((member) => {
                  const selected = selectedRecipients.includes(member.id);
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.filterChip, selected && styles.filterChipActive]}
                      onPress={() => toggleRecipient(member.id)}
                    >
                      <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{member.full_name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.sheetActionRow}>
              <TouchableOpacity style={styles.secondaryAction} onPress={pickAnnouncementImage}>
                <MaterialIcons name="image" size={16} color={theme.colors.primary} />
                <Text style={styles.secondaryActionText}>Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryAction} onPress={pickAnnouncementDocument}>
                <MaterialIcons name="attach-file" size={16} color={theme.colors.primary} />
                <Text style={styles.secondaryActionText}>Dosya</Text>
              </TouchableOpacity>
            </View>
            {announcementAttachment && <Text style={styles.photoText}>{announcementAttachment.name}</Text>}
            <TouchableOpacity
              style={[
                styles.primaryLarge,
                (!announcementTitle.trim() || !announcementBody.trim() || (!sendToAll && selectedRecipients.length === 0) || announcementSubmitting) && { opacity: 0.45 },
              ]}
              onPress={submitAnnouncement}
              disabled={!announcementTitle.trim() || !announcementBody.trim() || (!sendToAll && selectedRecipients.length === 0) || announcementSubmitting}
            >
              {announcementSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.primaryActionText}>Duyuruyu Gönder</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
    scrollContent: { padding: 16, paddingBottom: 120, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
    msgIconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    msgBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
    heroCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
    heroTop: { marginBottom: 12 },
    heroEyebrow: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: theme.colors.textMuted },
    heroTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 4 },
    heroButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primary },
    heroButtonText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
    compactStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
    compactStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    compactStatText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
    statDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.border },
    hintsList: { gap: 6, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 },
    hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    hintDot: { width: 7, height: 7, borderRadius: 4 },
    hintText: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
    hintBold: { fontWeight: '700', color: theme.colors.textPrimary },
    summaryRow: { flexDirection: 'row', gap: 10 },
    summaryCard: { flex: 1, borderRadius: 18, paddingVertical: 14, alignItems: 'center', backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border },
    summaryValue: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
    summaryLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginTop: 4, textTransform: 'uppercase', textAlign: 'center' },
    tabScrollView: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
    tabScrollContent: { gap: 0 },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 8, gap: 4, borderRightWidth: 1, borderRightColor: theme.colors.border },
    tabItemLast: { borderRightWidth: 0 },
    tabItemActive: { backgroundColor: theme.colors.primaryLight },
    tabItemText: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
    tabItemTextActive: { color: theme.colors.primary },
    tabChip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    tabChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    tabChipText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
    tabChipTextActive: { color: theme.colors.textInverse },
    sectionStack: { gap: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
    sectionSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
    primaryAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: theme.colors.primary },
    primaryActionText: { fontSize: 13, fontWeight: '700', color: theme.colors.textInverse },
    memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
    memberAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    memberAvatarText: { fontSize: 14, fontWeight: '800', color: theme.colors.primary },
    memberName: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
    memberMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
    filterRow: { gap: 8, paddingRight: 8 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterChipText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
    filterChipTextActive: { color: theme.colors.textInverse },
    emptyCard: { backgroundColor: theme.colors.surface, borderRadius: 22, paddingVertical: 32, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
    stateCard: { backgroundColor: theme.colors.surface, borderRadius: 22, paddingVertical: 28, paddingHorizontal: 18, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
    stateCardTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary, textAlign: 'center' },
    stateCardText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 19 },
    inlineWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: theme.colors.warningLight, borderWidth: 1, borderColor: `${theme.colors.warning}33` },
    inlineWarningText: { flex: 1, fontSize: 12, lineHeight: 18, color: theme.colors.warningText, fontWeight: '600' },
    taskCard: { backgroundColor: theme.colors.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
    taskHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    taskIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    taskTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
    taskMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
    taskInfo: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    announcementCard: { backgroundColor: theme.colors.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
    announcementTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
    announcementMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 6 },
    announcementBody: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 12, lineHeight: 20 },
    announcementAudience: { fontSize: 12, color: theme.colors.textMuted, marginTop: 10 },
    attachmentAction: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primary },
    announcementFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 14 },
    announcementCounter: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
    secondaryAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primary },
    secondaryActionText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
    readText: { fontSize: 12, fontWeight: '700', color: theme.colors.successText },
    modalOverlay: { flex: 1, backgroundColor: theme.colors.modalBackdrop, justifyContent: 'flex-end', padding: 12 },
    sheetCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, gap: 12, maxHeight: '88%' },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
    sheetSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
    sheetMeta: { fontSize: 13, color: theme.colors.textSecondary },
    sheetBody: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
    noteInput: { minHeight: 96, borderRadius: 16, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border, padding: 14, color: theme.colors.textPrimary, fontSize: 14, textAlignVertical: 'top' },
    sheetActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    photoText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
    sheetButtons: { gap: 10 },
    secondaryLarge: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primary },
    primaryLarge: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
    successLarge: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success },
    cancelLarge: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.errorLight, borderWidth: 1, borderColor: `${theme.colors.error}55` },
    cancelText: { fontSize: 13, fontWeight: '700', color: theme.colors.error },
    deleteLarge: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.error },
    deleteText: { fontSize: 13, fontWeight: '700', color: theme.colors.error },
    fieldInput: { borderRadius: 16, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, paddingVertical: 14, color: theme.colors.textPrimary, fontSize: 14 },
    bodyInput: { minHeight: 110, textAlignVertical: 'top' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    switchLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
    permissionRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 6 },
    permissionChip: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primary, paddingHorizontal: 12 },
    permissionChipActive: { backgroundColor: theme.colors.primary },
    permissionChipText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
    permissionChipTextActive: { color: theme.colors.textInverse },
  })
);
