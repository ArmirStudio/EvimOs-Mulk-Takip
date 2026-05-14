import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { createThemedStyles, useAppTheme } from '../theme';
import { tr } from '../translations';
import { listTeamMessages, createTeamMessage, markMessagesRead, getMessageReadStatus } from '../../services/appApi';
import { useUserData } from '../../hooks/useUserData';
import { prepareUploadAsset } from '../../services/uploadPreparation';
import { removeFilesFromSupabaseStorage, uploadFileToSupabaseStorage } from '../../services/supabaseStorage';
import type {
  TeamMessage,
  TeamMessageAttachmentDraft,
  TeamMessageAttachmentInput,
  TeamMessageReadStatus,
} from '../../services/teamTypes';
import TeamMessagesPanel from '../../components/Shared/TeamMessagesPanel';

const MAX_MESSAGE_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const TEAM_MESSAGE_BUCKET = 'team-message-files';

function getAttachmentKind(mimeType: string, name: string): TeamMessageAttachmentDraft['kind'] {
  const lowerName = name.toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) return 'document';
  return 'file';
}

function isUnsupportedAttachment(mimeType: string) {
  return mimeType.startsWith('audio/') || mimeType.startsWith('video/');
}

function sanitizeFileName(name: string) {
  const cleaned = name
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
  return cleaned || `attachment-${Date.now()}`;
}

export default function TeamMessagesScreen() {
  const theme = useAppTheme();
  const styles = useStyles();
  const { userData } = useUserData();

  const flatListRef = useRef<FlatList<any>>(null);

  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftAttachments, setDraftAttachments] = useState<TeamMessageAttachmentDraft[]>([]);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<TeamMessage | null>(null);
  const [readStatus, setReadStatus] = useState<TeamMessageReadStatus[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [msgRes, readRes] = await Promise.all([
        listTeamMessages(),
        getMessageReadStatus(),
      ]);
      setMessages((msgRes.messages as TeamMessage[]) || []);
      setReadStatus((readRes.readers as TeamMessageReadStatus[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Mesajlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void markMessagesRead().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 80);
    }
  }, [messages]);

  const addDraftAttachments = (items: Omit<TeamMessageAttachmentDraft, 'id' | 'kind'>[]) => {
    const availableSlots = MAX_MESSAGE_ATTACHMENTS - draftAttachments.length;
    if (availableSlots <= 0) {
      Alert.alert(tr.common.error, tr.team.messages.attachmentLimit);
      return;
    }

    let sawUnsupported = false;
    let sawTooLarge = false;
    const valid: TeamMessageAttachmentDraft[] = [];

    for (const item of items) {
      const mimeType = item.mimeType || 'application/octet-stream';
      if (isUnsupportedAttachment(mimeType)) {
        sawUnsupported = true;
        continue;
      }
      if (item.size && item.size > MAX_ATTACHMENT_BYTES) {
        sawTooLarge = true;
        continue;
      }
      const name = item.name || `attachment-${Date.now()}`;
      valid.push({
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name,
        mimeType,
        kind: getAttachmentKind(mimeType, name),
      });
    }

    if (sawUnsupported) {
      Alert.alert(tr.common.error, tr.team.messages.attachmentUnsupported);
    }
    if (sawTooLarge) {
      Alert.alert(tr.common.error, tr.team.messages.attachmentTooLarge);
    }
    if (valid.length > availableSlots) {
      Alert.alert(tr.common.error, tr.team.messages.attachmentLimit);
    }

    const nextItems = valid.slice(0, availableSlots);
    if (nextItems.length) {
      setDraftAttachments((prev) => [...prev, ...nextItems]);
    }
  };

  const handlePickCamera = async () => {
    setAttachmentMenuOpen(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(tr.errors.permissionRequired, tr.errors.cameraPermission);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      addDraftAttachments([{
        uri: asset.uri,
        name: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      }]);
    }
  };

  const handlePickGallery = async () => {
    setAttachmentMenuOpen(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(tr.errors.permissionRequired, tr.errors.galleryPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_MESSAGE_ATTACHMENTS,
      base64: false,
    });
    if (!result.canceled) {
      addDraftAttachments(result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `gallery-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      })));
    }
  };

  const handlePickFiles = async () => {
    setAttachmentMenuOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        addDraftAttachments(result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name || `file-${Date.now()}`,
          mimeType: asset.mimeType || 'application/octet-stream',
          size: asset.size,
        })));
      }
    } catch {
      Alert.alert(tr.common.error, tr.errors.loadFailed);
    }
  };

  const uploadDraftAttachments = async (
    attachments: TeamMessageAttachmentDraft[]
  ): Promise<{ inputs: TeamMessageAttachmentInput[]; uploadedPaths: string[] }> => {
    if (!attachments.length) return { inputs: [], uploadedPaths: [] };
    if (!userData?.id) {
      throw new Error('Kullanıcı bilgisi bulunamadı');
    }

    const officeOwnerId = userData.role === 'employee'
      ? userData.created_by
      : userData.id;

    if (!officeOwnerId) {
      throw new Error('Ofis bilgisi bulunamadı');
    }

    const timestamp = Date.now();
    const uploadedPaths: string[] = [];

    try {
      const inputs: TeamMessageAttachmentInput[] = [];

      for (const [index, attachment] of attachments.entries()) {
        const prepared = await prepareUploadAsset({
          uri: attachment.uri,
          name: attachment.name,
          mimeType: attachment.mimeType,
          size: attachment.size ?? null,
        });
        if (prepared.size && prepared.size > MAX_ATTACHMENT_BYTES) {
          throw new Error(tr.team.messages.attachmentTooLarge);
        }

        const safeName = sanitizeFileName(prepared.name);
        const path = `${officeOwnerId}/${userData.id}/${timestamp}-${index}-${safeName}`;
        const upload = await uploadFileToSupabaseStorage({
          bucket: TEAM_MESSAGE_BUCKET,
          path,
          fileUri: prepared.uri,
          contentType: prepared.mimeType,
        });
        uploadedPaths.push(upload.path);

        inputs.push({
          bucket: TEAM_MESSAGE_BUCKET,
          storage_path: upload.path,
          file_name: prepared.name,
          mime_type: prepared.mimeType,
          size_bytes: prepared.size,
          kind: attachment.kind,
        });
      }

      return { inputs, uploadedPaths };
    } catch (error) {
      await removeFilesFromSupabaseStorage(TEAM_MESSAGE_BUCKET, uploadedPaths).catch(() => {});
      throw error;
    }
  };

  const handleSend = async () => {
    const body = draft.trim();
    const attachmentSnapshot = draftAttachments;
    const replySnapshot = replyingTo;
    if ((!body && attachmentSnapshot.length === 0) || submitting) return;

    const tempId = `temp_${Date.now()}`;
    const replyId = replySnapshot?.id ?? null;
    let uploadedPaths: string[] = [];

    setSubmitting(true);
    try {
      const uploadResult = await uploadDraftAttachments(attachmentSnapshot);
      const uploadedAttachments = uploadResult.inputs;
      uploadedPaths = uploadResult.uploadedPaths;
      setDraft('');
      setDraftAttachments([]);
      setAttachmentMenuOpen(false);
      setReplyingTo(null);

      const tempMessage: TeamMessage = {
        id: tempId,
        office_owner_id: '',
        sender_id: userData?.id ?? null,
        body,
        created_at: new Date().toISOString(),
        sender_name: userData?.full_name ?? 'Sen',
        reply_to_id: replyId,
        reply_to: replySnapshot
          ? { id: replySnapshot.id, body: replySnapshot.body, sender_name: replySnapshot.sender_name ?? null }
          : null,
        attachments: uploadedAttachments.map((attachment, index) => ({
          ...attachment,
          id: `${tempId}_att_${index}`,
          message_id: tempId,
          office_owner_id: '',
          uploaded_by: userData?.id ?? null,
          created_at: new Date().toISOString(),
        })),
      };
      setMessages((prev) => [...prev, tempMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);

      await createTeamMessage({
        body,
        reply_to_id: replyId,
        attachments: uploadedAttachments,
      });
      const res = await listTeamMessages();
      setMessages((res.messages as TeamMessage[]) || []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 80);
    } catch (e: any) {
      await removeFilesFromSupabaseStorage(TEAM_MESSAGE_BUCKET, uploadedPaths).catch(() => {});
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(body);
      setDraftAttachments(attachmentSnapshot);
      setReplyingTo(replySnapshot);
      Alert.alert('Gonderilemedi', e?.message || tr.team.messages.attachmentUploadFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{tr.team.messages.title}</Text>
        <View style={styles.backBtn} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TeamMessagesPanel
          flatListRef={flatListRef}
          messages={messages}
          loading={loading}
          error={error}
          draft={draft}
          draftAttachments={draftAttachments}
          attachmentMenuOpen={attachmentMenuOpen}
          submitting={submitting}
          currentUserId={userData?.id}
          replyingTo={replyingTo}
          readStatus={readStatus}
          onChangeDraft={setDraft}
          onRetry={() => void load()}
          onSend={() => void handleSend()}
          onToggleAttachmentMenu={() => setAttachmentMenuOpen((prev) => !prev)}
          onPickCamera={() => void handlePickCamera()}
          onPickGallery={() => void handlePickGallery()}
          onPickFiles={() => void handlePickFiles()}
          onRemoveDraftAttachment={(id) => setDraftAttachments((prev) => prev.filter((item) => item.id !== id))}
          onReply={setReplyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    title: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
  })
);
