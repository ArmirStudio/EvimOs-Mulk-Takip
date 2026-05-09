import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { tr } from '../../app/translations';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { createSignedStorageUrl } from '../../services/supabaseStorage';
import type {
  TeamMessage,
  TeamMessageAttachment,
  TeamMessageAttachmentDraft,
  TeamMessageReadStatus,
} from '../../services/teamTypes';

type DaySeparator = { type: 'day'; label: string; key: string };
type ListItem = TeamMessage | DaySeparator;

type Props = {
  flatListRef?: React.RefObject<FlatList<any> | null>;
  messages: TeamMessage[];
  loading: boolean;
  error: string | null;
  draft: string;
  draftAttachments: TeamMessageAttachmentDraft[];
  attachmentMenuOpen: boolean;
  submitting: boolean;
  currentUserId?: string | null;
  replyingTo?: TeamMessage | null;
  readStatus?: TeamMessageReadStatus[];
  onChangeDraft: (value: string) => void;
  onRetry: () => void;
  onSend: () => void;
  onToggleAttachmentMenu: () => void;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onPickFiles: () => void;
  onRemoveDraftAttachment: (id: string) => void;
  onReply?: (message: TeamMessage) => void;
  onCancelReply?: () => void;
};

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Bugün';
  if (d.toDateString() === yesterday.toDateString()) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatMessageTime(value?: string | null): string {
  if (!value) return tr.team.messages.now;
  const d = new Date(value);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function buildListItems(messages: TeamMessage[]): ListItem[] {
  const items: ListItem[] = [];
  let lastDay = '';
  for (const msg of messages) {
    const day = new Date(msg.created_at).toDateString();
    if (day !== lastDay) {
      items.push({ type: 'day', label: formatDayLabel(msg.created_at), key: `day_${day}` });
      lastDay = day;
    }
    items.push(msg);
  }
  return items;
}

function getReadCount(
  message: TeamMessage,
  readStatus: TeamMessageReadStatus[],
  currentUserId: string
): number {
  return readStatus.filter(
    (r) =>
      r.user_id !== currentUserId &&
      new Date(r.last_read_at) >= new Date(message.created_at)
  ).length;
}

function formatFileSize(size?: number | null): string {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getAttachmentIcon(kind?: string | null): keyof typeof MaterialIcons.glyphMap {
  if (kind === 'image') return 'image';
  if (kind === 'document') return 'description';
  return 'attach-file';
}

function MessageImagePreview({
  attachment,
  onPress,
}: {
  attachment: TeamMessageAttachment;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void createSignedStorageUrl('team-message-files', attachment.storage_path).then((url) => {
      if (mounted) setUri(url);
    });
    return () => {
      mounted = false;
    };
  }, [attachment.storage_path]);

  return (
    <TouchableOpacity style={styles.imageAttachmentWrap} onPress={onPress} activeOpacity={0.86}>
      {uri ? (
        <Image source={{ uri }} style={styles.imageAttachment} resizeMode="cover" />
      ) : (
        <View style={styles.imageAttachmentPlaceholder}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}
      <View style={styles.imageAttachmentMeta}>
        <MaterialIcons name="image" size={14} color={theme.colors.textInverse} />
        <Text style={styles.imageAttachmentName} numberOfLines={1}>{attachment.file_name}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TeamMessagesPanel({
  flatListRef,
  messages,
  loading,
  error,
  draft,
  draftAttachments,
  attachmentMenuOpen,
  submitting,
  currentUserId,
  replyingTo,
  readStatus = [],
  onChangeDraft,
  onRetry,
  onSend,
  onToggleAttachmentMenu,
  onPickCamera,
  onPickGallery,
  onPickFiles,
  onRemoveDraftAttachment,
  onReply,
  onCancelReply,
}: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const inputRef = useRef<TextInput>(null);

  const listItems = buildListItems(messages);
  const canSend = !!draft.trim() || draftAttachments.length > 0;

  const handleOpenAttachment = async (attachment: TeamMessageAttachment) => {
    try {
      const url = await createSignedStorageUrl('team-message-files', attachment.storage_path);
      if (!url) throw new Error('missing url');
      await Linking.openURL(url);
    } catch {
      Alert.alert(tr.common.error, tr.team.messages.attachmentOpenFailed);
    }
  };

  const renderStateCard = ({
    icon,
    title,
    description,
    actionLabel,
  }: {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    description: string;
    actionLabel?: string;
  }) => (
    <View style={styles.stateCard}>
      <MaterialIcons name={icon} size={34} color={theme.colors.textMuted} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{description}</Text>
      {actionLabel ? (
        <TouchableOpacity style={styles.secondaryAction} onPress={onRetry}>
          <MaterialIcons name="refresh" size={16} color={theme.colors.primary} />
          <Text style={styles.secondaryActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderItem = ({ item }: { item: ListItem }) => {
    if ('type' in item && item.type === 'day') {
      return (
        <View style={styles.daySeparatorRow}>
          <View style={styles.daySeparatorLine} />
          <Text style={styles.daySeparatorLabel}>{item.label}</Text>
          <View style={styles.daySeparatorLine} />
        </View>
      );
    }

    const message = item as TeamMessage;
    const isOwn = !!(currentUserId && message.sender_id === currentUserId);
    const readCount = isOwn ? getReadCount(message, readStatus, currentUserId!) : 0;
    const isTemp = message.id.startsWith('temp_');

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => onReply?.(message)}
        style={[styles.messageRow, isOwn && styles.messageRowOwn]}
      >
        {!isOwn && (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(message.sender_name || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {!isOwn && (
            <Text style={styles.bubbleSenderName}>
              {message.sender_name || tr.team.messages.authorFallback}
            </Text>
          )}
          {message.reply_to && (
            <View style={styles.replyQuote}>
              <Text style={styles.replyQuoteSender} numberOfLines={1}>
                {message.reply_to.sender_name || tr.team.messages.authorFallback}
              </Text>
              <Text style={styles.replyQuoteBody} numberOfLines={2}>
                {message.reply_to.body}
              </Text>
            </View>
          )}
          {message.body ? (
            <Text style={[styles.bubbleBody, isOwn && styles.bubbleBodyOwn]}>
              {message.body}
            </Text>
          ) : null}
          {message.attachments?.length ? (
            <View style={styles.messageAttachments}>
              {message.attachments.map((attachment) => (
                attachment.kind === 'image' ? (
                  <MessageImagePreview
                    key={attachment.id}
                    attachment={attachment}
                    onPress={() => void handleOpenAttachment(attachment)}
                  />
                ) : (
                  <TouchableOpacity
                    key={attachment.id}
                    style={styles.messageAttachmentChip}
                    onPress={() => void handleOpenAttachment(attachment)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={getAttachmentIcon(attachment.kind)}
                      size={17}
                      color={theme.colors.primary}
                    />
                    <View style={styles.attachmentTextBlock}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {attachment.file_name}
                      </Text>
                      <Text style={styles.attachmentMeta} numberOfLines={1}>
                        {formatFileSize(attachment.size_bytes)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              ))}
            </View>
          ) : null}
          <View style={styles.bubbleMeta}>
            <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
              {formatMessageTime(message.created_at)}
            </Text>
            {isOwn && (
              <View style={styles.readTick}>
                {isTemp ? (
                  <MaterialIcons name="schedule" size={13} color={theme.colors.textMuted} />
                ) : readCount > 0 ? (
                  <>
                    <MaterialIcons name="done-all" size={14} color={theme.colors.primary} />
                  </>
                ) : (
                  <MaterialIcons name="done" size={13} color={theme.colors.textMuted} />
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListContent = () => {
    if (loading && messages.length === 0) {
      return renderStateCard({
        icon: 'forum',
        title: tr.team.messages.loadingTitle,
        description: tr.team.messages.loadingSubtitle,
      });
    }
    if (error && messages.length === 0) {
      return renderStateCard({
        icon: 'forum',
        title: tr.team.messages.errorTitle,
        description: error,
        actionLabel: 'Tekrar dene',
      });
    }
    if (messages.length === 0) {
      return renderStateCard({
        icon: 'forum',
        title: tr.team.messages.emptyTitle,
        description: tr.team.messages.emptySubtitle,
      });
    }
    return null;
  };

  const emptyContent = renderListContent();

  return (
    <View style={styles.container}>
      {error && messages.length > 0 && (
        <View style={styles.inlineWarning}>
          <MaterialIcons name="error-outline" size={18} color={theme.colors.warningText} />
          <Text style={styles.inlineWarningText}>{tr.team.messages.refreshFailed}</Text>
        </View>
      )}

      {emptyContent ? (
        <View style={styles.emptyArea}>{emptyContent}</View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listItems}
          keyExtractor={(item) => ('type' in item && item.type === 'day' ? (item as DaySeparator).key : (item as TeamMessage).id)}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {replyingTo && (
        <View style={styles.replyBar}>
          <MaterialIcons name="reply" size={18} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBarSender} numberOfLines={1}>
              {replyingTo.sender_name || tr.team.messages.authorFallback}
            </Text>
            <Text style={styles.replyBarBody} numberOfLines={1}>
              {replyingTo.body}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {attachmentMenuOpen && (
        <View style={styles.attachmentMenu}>
          <TouchableOpacity style={styles.attachmentMenuItem} onPress={onPickCamera} activeOpacity={0.8}>
            <MaterialIcons name="photo-camera" size={20} color={theme.colors.primary} />
            <Text style={styles.attachmentMenuText}>{tr.team.messages.attachmentCamera}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachmentMenuItem} onPress={onPickGallery} activeOpacity={0.8}>
            <MaterialIcons name="photo-library" size={20} color={theme.colors.primary} />
            <Text style={styles.attachmentMenuText}>{tr.team.messages.attachmentGallery}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachmentMenuItem} onPress={onPickFiles} activeOpacity={0.8}>
            <MaterialIcons name="folder-open" size={20} color={theme.colors.primary} />
            <Text style={styles.attachmentMenuText}>{tr.team.messages.attachmentFiles}</Text>
          </TouchableOpacity>
        </View>
      )}

      {draftAttachments.length > 0 && (
        <View style={styles.draftAttachments}>
          {draftAttachments.map((attachment) => (
            <View key={attachment.id} style={[styles.draftAttachmentChip, attachment.kind === 'image' && styles.draftAttachmentChipImage]}>
              {attachment.kind === 'image' ? (
                <Image source={{ uri: attachment.uri }} style={styles.draftImageThumb} resizeMode="cover" />
              ) : (
                <MaterialIcons
                  name={getAttachmentIcon(attachment.kind)}
                  size={17}
                  color={theme.colors.primary}
                />
              )}
              <View style={styles.attachmentTextBlock}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <Text style={styles.attachmentMeta} numberOfLines={1}>
                  {formatFileSize(attachment.size)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onRemoveDraftAttachment(attachment.id)}
                accessibilityLabel={tr.team.messages.attachmentRemove}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.composer}>
        <TouchableOpacity
          style={[styles.plusBtn, attachmentMenuOpen && styles.plusBtnActive]}
          onPress={onToggleAttachmentMenu}
          disabled={submitting}
          accessibilityLabel={tr.team.messages.attachmentMenuAction}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={attachmentMenuOpen ? 'close' : 'add'}
            size={24}
            color={attachmentMenuOpen ? theme.colors.textInverse : theme.colors.primary}
          />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.composerInput}
          value={draft}
          onChangeText={onChangeDraft}
          placeholder={tr.team.messages.composerPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          maxLength={2000}
          textAlignVertical="center"
        />
        {canSend ? (
          <TouchableOpacity
            style={[styles.sendBtn, submitting && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={submitting || !canSend}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <MaterialIcons name="send" size={20} color={theme.colors.textInverse} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    emptyArea: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 4,
    },
    daySeparatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 10,
      gap: 8,
    },
    daySeparatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    daySeparatorLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textMuted,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginVertical: 3,
      gap: 8,
    },
    messageRowOwn: {
      flexDirection: 'row-reverse',
    },
    avatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    bubble: {
      maxWidth: '76%',
      borderRadius: 18,
      paddingHorizontal: 13,
      paddingVertical: 9,
      gap: 4,
    },
    bubbleOther: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderBottomLeftRadius: 4,
    },
    bubbleOwn: {
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}33`,
      borderBottomRightRadius: 4,
    },
    bubbleSenderName: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: 1,
    },
    replyQuote: {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      paddingLeft: 8,
      paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: `${theme.colors.primary}11`,
      marginBottom: 4,
      gap: 2,
    },
    replyQuoteSender: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    replyQuoteBody: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    bubbleBody: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textPrimary,
    },
    bubbleBodyOwn: {
      color: theme.colors.textPrimary,
    },
    bubbleMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: 2,
    },
    messageAttachments: {
      gap: 6,
      marginTop: 4,
    },
    messageAttachmentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    imageAttachmentWrap: {
      width: 220,
      maxWidth: '100%',
      aspectRatio: 1.45,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface2,
    },
    imageAttachment: {
      width: '100%',
      height: '100%',
    },
    imageAttachmentPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface2,
    },
    imageAttachmentMeta: {
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 8,
      minHeight: 26,
      borderRadius: 13,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(0,0,0,0.48)',
    },
    imageAttachmentName: {
      flex: 1,
      minWidth: 0,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textInverse,
    },
    attachmentTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    attachmentName: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    attachmentMeta: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    bubbleTime: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    bubbleTimeOwn: {
      color: theme.colors.textMuted,
    },
    readTick: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inlineWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 12,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.warningLight,
    },
    inlineWarningText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.warningText,
      fontWeight: '600',
    },
    stateCard: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 18,
      paddingVertical: 28,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    stateTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
    stateText: { fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary, textAlign: 'center' },
    secondaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.primaryLight,
    },
    secondaryActionText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
    replyBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    replyBarSender: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    replyBarBody: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    attachmentMenu: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 12,
      marginBottom: 8,
      padding: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: 8,
    },
    attachmentMenuItem: {
      flex: 1,
      minHeight: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface2,
      gap: 4,
    },
    attachmentMenuText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    draftAttachments: {
      gap: 8,
      paddingHorizontal: 12,
      paddingBottom: 8,
      backgroundColor: theme.colors.surface,
    },
    draftAttachmentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface2,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    draftAttachmentChipImage: {
      minHeight: 54,
    },
    draftImageThumb: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: 10,
    },
    plusBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    plusBtnActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    composerInput: {
      flex: 1,
      minHeight: 54,
      maxHeight: 150,
      marginTop: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface2,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sendBtnDisabled: {
      opacity: 0.6,
    },
  })
);
