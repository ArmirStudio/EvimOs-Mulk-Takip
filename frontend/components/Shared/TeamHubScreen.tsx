import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  KeyboardAvoidingView,
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
  createTeamMessage,
  createUser,
  createTeamAnnouncement,
  getTeamReport,
  getTeamTask,
  listTeamAnnouncements,
  listTeamMessages,
  listTeamMembers,
  listTeamTasks,
  markAnnouncementRead,
  remindAnnouncement,
  transitionTeamTask,
} from '../../services/appApi';
import type {
  TeamAnnouncement,
  TeamMember,
  TeamMessage,
  TeamReportPayload,
  TeamReportRange,
  TeamTab,
  TeamTask,
} from '../../services/teamTypes';
import { resolveSupabaseStorageUrl, uploadFileToSupabaseStorage } from '../../services/supabaseStorage';
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
import TeamMessagesPanel from './TeamMessagesPanel';
import TeamReportPanel from './TeamReportPanel';

type AnnouncementAttachmentDraft = {
  uri: string;
  mimeType: string;
  name: string;
  kind: 'image' | 'document' | 'file';
};

type TaskFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

function normalizeTab(tab?: string, canSeeReport = false): TeamTab {
  if (tab === 'team' || tab === 'tasks' || tab === 'announcements' || tab === 'messages') return tab;
  if (tab === 'report' && canSeeReport) return 'report';
  return 'team';
}

export default function TeamHubScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string; openTaskId?: string }>();
  const { userData, loading: userLoading } = useUserData();

  const isManager = userData?.role === 'agent' || hasFullEmployeeAccess(userData);
  const canSeeReport = isManager;
  const canManageEmployees = userData?.role === 'agent';
  const currentTab = normalizeTab(params.tab, canSeeReport);

  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [announcements, setAnnouncements] = useState<TeamAnnouncement[]>([]);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [reportRange, setReportRange] = useState<TeamReportRange>('this_week');

  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);
  const [employeeFullName, setEmployeeFullName] = useState('');
  const [employeeIdentifier, setEmployeeIdentifier] = useState('');
  const [employeePhone, setEmployeePhone] = useState('');
  const [employeeCity, setEmployeeCity] = useState('');
  const [employeeDistrict, setEmployeeDistrict] = useState('');
  const [employeeAccessLevel, setEmployeeAccessLevel] = useState<'full' | 'limited'>('limited');

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [taskModalLoading, setTaskModalLoading] = useState(false);
  const [taskModalSubmitting, setTaskModalSubmitting] = useState(false);
  const [taskActionNote, setTaskActionNote] = useState('');
  const [taskActionPhotos, setTaskActionPhotos] = useState<string[]>([]);

  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [announcementAttachment, setAnnouncementAttachment] = useState<AnnouncementAttachmentDraft | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [messageSubmitting, setMessageSubmitting] = useState(false);
  const [reportPayload, setReportPayload] = useState<TeamReportPayload | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const announcementRecipients = useMemo(() => members, [members]);
  const summary = useMemo(() => ({
    memberCount: members.length,
    openTasks: tasks.filter((task) => ['pending', 'in_progress'].includes(task.status)).length,
    unreadAnnouncements: announcements.filter((item) => !item.viewer_is_read).length,
  }), [announcements, members.length, tasks]);
  const reportHasData = useMemo(() => {
    if (!reportPayload) {
      return false;
    }

    return Object.values(reportPayload.sections).some((section) =>
      section.bars.some((bar) => bar.value > 0)
    );
  }, [reportPayload]);

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

  const loadTeamReport = useCallback(async () => {
    try {
      setReportLoading(true);
      setReportError(null);
      setReportPayload((current) => (current?.range === reportRange ? current : null));
      const nextPayload = await getTeamReport(reportRange);
      setReportPayload(nextPayload);
    } catch (error: any) {
      setReportError(error.message || 'Rapor verileri yuklenemedi.');
    } finally {
      setReportLoading(false);
    }
  }, [reportRange]);

  const loadHubData = useCallback(async () => {
    await Promise.allSettled([
      loadMembers(),
      loadTasks(),
      loadAnnouncements(),
      loadMessages(),
    ]);
  }, [loadAnnouncements, loadMembers, loadMessages, loadTasks]);

  useFocusEffect(
    useCallback(() => {
      if (!userLoading && userData?.id) {
        loadHubData();
      }
    }, [loadHubData, userData?.id, userLoading])
  );

  useFocusEffect(
    useCallback(() => {
      if (!userLoading && userData?.id && canSeeReport && currentTab === 'report') {
        loadTeamReport();
      }
    }, [canSeeReport, currentTab, loadTeamReport, userData?.id, userLoading])
  );

  useEffect(() => {
    if (params.tab === 'report' && !canSeeReport) {
      router.replace('/agent/team?tab=team' as never);
    }
  }, [canSeeReport, params.tab]);

  useEffect(() => {
    if (params.openTaskId && typeof params.openTaskId === 'string') {
      setSelectedTaskId(params.openTaskId);
    }
  }, [params.openTaskId]);

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

  const openTab = (tab: TeamTab) => router.replace(`/agent/team?tab=${tab}` as never);
  const onRefresh = () => {
    setRefreshing(true);
    const requests: Promise<unknown>[] = [loadHubData()];
    if (canSeeReport && currentTab === 'report') {
      requests.push(loadTeamReport());
    }
    void Promise.allSettled(requests).finally(() => setRefreshing(false));
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
    if (employeeSubmitting) {
      return;
    }
    setEmployeeModalVisible(false);
    resetEmployeeForm();
  };

  const closeTaskModal = () => {
    setSelectedTaskId(null);
    setSelectedTask(null);
    setTaskActionNote('');
    setTaskActionPhotos([]);
    if (params.openTaskId) {
      router.replace(`/agent/team?tab=${currentTab}` as never);
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
      Alert.alert('Eksik Bilgi', 'Sehir ve ilce secimi zorunludur.');
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

      await createUser({
        email: resolvedEmail,
        password: '1234',
        role: 'employee',
        full_name: employeeFullName.trim(),
        phone: resolvedPhone,
        city: employeeCity.trim(),
        district: employeeDistrict.trim(),
        employee_access_level: employeeAccessLevel,
      });

      setEmployeeModalVisible(false);
      resetEmployeeForm();
      await Promise.allSettled([loadMembers(), loadAnnouncements()]);
      Alert.alert('Çalışan Oluşturuldu', `Giriş: ${trimmedIdentifier}\nŞifre: 1234`);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Çalışan oluşturulamadı.');
    } finally {
      setEmployeeSubmitting(false);
    }
  };

  const pickAnnouncementImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
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
      Alert.alert('Eksik Bilgi', 'Baslik ve icerik zorunludur.');
      return;
    }
    if (!sendToAll && selectedRecipients.length === 0) {
      Alert.alert('Eksik Bilgi', 'En az bir alici secin.');
      return;
    }

    try {
      setAnnouncementSubmitting(true);
      let attachmentPath: string | null = null;
      let attachmentKind: AnnouncementAttachmentDraft['kind'] | null = null;

      if (announcementAttachment) {
        const ext = announcementAttachment.name.includes('.') ? announcementAttachment.name.split('.').pop() : 'bin';
        const upload = await uploadFileToSupabaseStorage({
          bucket: 'announcement-files',
          path: `${userData?.id || 'office'}/${Date.now()}.${ext}`,
          fileUri: announcementAttachment.uri,
          contentType: announcementAttachment.mimeType,
        });
        attachmentPath = upload.path;
        attachmentKind = announcementAttachment.kind;
      }

      await createTeamAnnouncement({
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
        send_to_all: sendToAll,
        recipient_ids: sendToAll ? [] : selectedRecipients,
        attachment_path: attachmentPath,
        attachment_kind: attachmentKind,
      });

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
      Alert.alert('Hata', error.message || 'Duyuru okunmus olarak isaretlenemedi.');
    }
  };

  const remindUnreadUsers = async (announcementId: string) => {
    try {
      const response = await remindAnnouncement(announcementId);
      Alert.alert('Hatirlatma Gonderildi', `${response.reminded_count} kisiye hatirlatma gitti.`);
      await loadHubData();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Hatirlatma gonderilemedi.');
    }
  };

  const openAnnouncementAttachment = async (announcement: TeamAnnouncement) => {
    const url = resolveSupabaseStorageUrl('announcement-files', announcement.attachment_path);
    if (!url) {
      Alert.alert('Dosya Acilamadi', 'Duyuru eki icin gecerli bir baglanti bulunamadi.');
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Dosya Acilamadi', 'Ek dosya su anda acilamiyor.');
    }
  };

  const submitMessage = async () => {
    if (!messageDraft.trim()) {
      Alert.alert('Bilgi', tr.team.messages.sendEmpty);
      return;
    }

    try {
      setMessageSubmitting(true);
      const response = await createTeamMessage({ body: messageDraft.trim() });
      setMessages((current) => [...current, response.message]);
      setMessageDraft('');
    } catch (error: any) {
      Alert.alert('Hata', error.message || tr.team.messages.sendFailed);
    } finally {
      setMessageSubmitting(false);
    }
  };

  const pickTaskPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.7,
    });
    if (!result.canceled) {
      setTaskActionPhotos((prev) => [...prev, ...result.assets.map((asset) => asset.uri)].slice(0, 5));
    }
  };

  const uploadTaskPhotos = async (taskId: string) => {
    const uploads: string[] = [];
    for (let index = 0; index < taskActionPhotos.length; index += 1) {
      const upload = await uploadFileToSupabaseStorage({
        bucket: 'task-photos',
        path: `${taskId}/${Date.now()}-${index}.jpg`,
        fileUri: taskActionPhotos[index],
        contentType: 'image/jpeg',
      });
      uploads.push(upload.path);
    }
    return uploads;
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

  const visibleTabs: TeamTab[] = canSeeReport
    ? ['team', 'tasks', 'announcements', 'messages', 'report']
    : ['team', 'tasks', 'announcements', 'messages'];

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

  if (userLoading || (membersLoading && !members.length && !membersError)) {
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16 + insets.top }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Ekibim</Text>
            <Text style={styles.headerSubtitle}>
              {isManager
                ? 'Ofis ekibini, görev akışını ve duyuruları aynı merkezden yönetin.'
                : 'Rosteri, size atanan görevleri ve duyuruları buradan takip edin.'}
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>Ofis Merkezi</Text>
              <Text style={styles.heroTitle}>Takım nabzı tek yerde</Text>
            </View>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => openTab(canSeeReport ? 'report' : 'tasks')}
              activeOpacity={0.85}
            >
              <MaterialIcons name={canSeeReport ? 'bar-chart' : 'task'} size={18} color={theme.colors.primary} />
              <Text style={styles.heroButtonText}>{canSeeReport ? 'Rapor' : 'Görevler'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.memberCount}</Text>
              <Text style={styles.summaryLabel}>Ofis Kullanici</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.openTasks}</Text>
              <Text style={styles.summaryLabel}>Açık Görev</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.unreadAnnouncements}</Text>
              <Text style={styles.summaryLabel}>Okunmayan</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          {visibleTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabChip, currentTab === tab && styles.tabChipActive]}
              onPress={() => openTab(tab)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabChipText, currentTab === tab && styles.tabChipTextActive]}>
                {TEAM_TAB_LABELS[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {currentTab === 'team' && (
          <View style={styles.sectionStack}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Ofis Rosteri</Text>
                <Text style={styles.sectionSubtitle}>Ofis sahibi ve aynı ofise bağlı çalışan kullanıcılar.</Text>
              </View>
              {canManageEmployees && (
                <TouchableOpacity style={styles.primaryAction} onPress={() => setEmployeeModalVisible(true)}>
                  <MaterialIcons name="person-add" size={18} color={theme.colors.textInverse} />
                  <Text style={styles.primaryActionText}>Çalışan Ekle</Text>
                </TouchableOpacity>
              )}
            </View>

            {membersError && members.length > 0 && (
              <View style={styles.inlineWarning}>
                <MaterialIcons name="error-outline" size={18} color={theme.colors.warningText} />
                <Text style={styles.inlineWarningText}>Son roster yenilemesi basarisiz oldu. Mevcut veriler gosteriliyor.</Text>
              </View>
            )}

            {membersLoading && members.length === 0 ? (
              renderSectionStateCard({
                icon: 'groups',
                title: 'Rosteri hazirlaniyor',
                description: 'Ofis uyeleri yukleniyor.',
              })
            ) : membersError && members.length === 0 ? (
              renderSectionStateCard({
                icon: 'groups',
                title: 'Rosteri yukleyemedik',
                description: membersError,
                actionLabel: 'Tekrar dene',
                onAction: loadMembers,
              })
            ) : members.length === 0 ? (
              renderSectionStateCard({
                icon: 'groups',
                title: 'Çalışan bulunamadı',
                description: canManageEmployees
                  ? 'Bu ofiste henüz çalışan yok. Yeni bir çalışan ekleyebilirsiniz.'
                  : 'Bu ofiste henüz roster verisi görünmüyor.',
              })
            ) : (
              members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberCard}
                  onPress={() => isManager && router.push(`/agent/team-member?id=${member.id}` as never)}
                  activeOpacity={isManager ? 0.85 : 1}
                  disabled={!isManager}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{(member.full_name || '?').slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{member.full_name}</Text>
                    <Text style={styles.memberMeta}>{member.email || 'E-posta yok'}</Text>
                    <Text style={styles.memberMeta}>
                      {member.member_type === 'owner'
                        ? 'Patron'
                        : member.employee_access_level === 'full'
                        ? 'Tam Yetki'
                        : 'Sinirli Yetki'}
                    </Text>
                  </View>
                  {isManager && <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {currentTab === 'tasks' && (
          <View style={styles.sectionStack}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Görev Akışı</Text>
                <Text style={styles.sectionSubtitle}>{isManager ? 'Tüm ofis görevleri.' : 'Sadece size atanan görevler.'}</Text>
              </View>
              {isManager && (
                <TouchableOpacity style={styles.primaryAction} onPress={() => router.push('/agent/task-form' as never)}>
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

        {currentTab === 'announcements' && (
          <View style={styles.sectionStack}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Duyurular</Text>
                <Text style={styles.sectionSubtitle}>{isManager ? 'Tum ekip veya secili kisilere gonderin.' : 'Size gelen ekip duyurulari.'}</Text>
              </View>
              {isManager && (
                <TouchableOpacity style={styles.primaryAction} onPress={() => setAnnouncementModalVisible(true)}>
                  <MaterialIcons name="campaign" size={18} color={theme.colors.textInverse} />
                <Text style={styles.primaryActionText}>Olustur</Text>
              </TouchableOpacity>
            )}
            </View>
            {announcementsError && announcements.length > 0 && (
              <View style={styles.inlineWarning}>
                <MaterialIcons name="error-outline" size={18} color={theme.colors.warningText} />
                <Text style={styles.inlineWarningText}>Duyurular yenilenemedi. Son basarili veri gosteriliyor.</Text>
              </View>
            )}
            {announcementsLoading && announcements.length === 0 ? (
              renderSectionStateCard({
                icon: 'campaign',
                title: 'Duyurular yukleniyor',
                description: 'Son ekip duyurulari getiriliyor.',
              })
            ) : announcementsError && announcements.length === 0 ? (
              renderSectionStateCard({
                icon: 'campaign',
                title: 'Duyurulari yukleyemedik',
                description: announcementsError,
                actionLabel: 'Tekrar dene',
                onAction: loadAnnouncements,
              })
            ) : announcements.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="campaign" size={36} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>Duyuru bulunamadi</Text>
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
                          <Text style={styles.secondaryActionText}>Hatirlat</Text>
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

        {currentTab === 'messages' && (
          <TeamMessagesPanel
            messages={messages}
            loading={messagesLoading}
            error={messagesError}
            draft={messageDraft}
            submitting={messageSubmitting}
            currentUserId={userData?.id}
            onChangeDraft={setMessageDraft}
            onRetry={() => {
              void loadMessages();
            }}
            onSend={() => {
              void submitMessage();
            }}
          />
        )}

        {currentTab === 'report' && canSeeReport && (
          <View style={styles.sectionStack}>
            <View>
              <Text style={styles.sectionTitle}>Rapor</Text>
              <Text style={styles.sectionSubtitle}>Görev, duyuru ve bakım istatistikleri seçilen aralığa göre hesaplanır.</Text>
            </View>
            {reportLoading && reportPayload && (
              <View style={styles.inlineWarning}>
                <ActivityIndicator size="small" color={theme.colors.warningText} />
                <Text style={styles.inlineWarningText}>Rapor verileri yenileniyor.</Text>
              </View>
            )}
            {reportError ? (
              renderSectionStateCard({
                icon: 'error-outline',
                title: 'Rapor yuklenemedi',
                description: reportError,
                actionLabel: 'Tekrar dene',
                onAction: () => {
                  void loadTeamReport();
                },
              })
            ) : reportLoading && !reportPayload ? (
              renderSectionStateCard({
                icon: 'bar-chart',
                title: 'Rapor yukleniyor',
                description: 'Guncel ekip ve operasyon verileri hesaplaniyor.',
              })
            ) : reportHasData ? (
              <TeamReportPanel payload={reportPayload!} range={reportRange} onRangeChange={setReportRange} />
            ) : (
              renderSectionStateCard({
                icon: 'bar-chart',
                title: 'Henüz veri yok',
                description: 'Seçilen aralıkta raporlanacak görev, duyuru veya bakım kaydı bulunmuyor.',
              })
            )}
          </View>
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
                    <TouchableOpacity style={styles.secondaryLarge} onPress={() => router.push(`/agent/task-form?taskId=${selectedTask.id}` as never)}>
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
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={announcementModalVisible} transparent animationType="slide" onRequestClose={() => setAnnouncementModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAnnouncementModalVisible(false)}>
          <Pressable style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Duyuru Olustur</Text>
                <Text style={styles.sheetSubtitle}>Tum ekip veya secili kisilere gidebilir.</Text>
              </View>
              <TouchableOpacity onPress={() => setAnnouncementModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.fieldInput}
              placeholder="Baslik"
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
              <Text style={styles.switchLabel}>Tum ekibe gitsin</Text>
              <Switch value={sendToAll} onValueChange={setSendToAll} />
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
            <TouchableOpacity style={styles.primaryLarge} onPress={submitAnnouncement} disabled={announcementSubmitting}>
              {announcementSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.primaryActionText}>Duyuruyu Gonder</Text>
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
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
    headerSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6, lineHeight: 18 },
    heroCard: { backgroundColor: theme.colors.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.md },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    heroEyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: theme.colors.textMuted },
    heroTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 8 },
    heroButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primary },
    heroButtonText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
    summaryRow: { flexDirection: 'row', gap: 10 },
    summaryCard: { flex: 1, borderRadius: 18, paddingVertical: 14, alignItems: 'center', backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border },
    summaryValue: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
    summaryLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, marginTop: 4, textTransform: 'uppercase', textAlign: 'center' },
    tabBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
