import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { tr } from '../../app/translations';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import type { TeamMessage } from '../../services/teamTypes';

type Props = {
  messages: TeamMessage[];
  loading: boolean;
  error: string | null;
  draft: string;
  submitting: boolean;
  currentUserId?: string | null;
  onChangeDraft: (value: string) => void;
  onRetry: () => void;
  onSend: () => void;
};

function formatMessageTime(value?: string | null) {
  if (!value) {
    return tr.team.messages.now;
  }

  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TeamMessagesPanel({
  messages,
  loading,
  error,
  draft,
  submitting,
  currentUserId,
  onChangeDraft,
  onRetry,
  onSend,
}: Props) {
  const theme = useAppTheme();
  const styles = useStyles();

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

  return (
    <View style={styles.sectionStack}>
      <View>
        <Text style={styles.sectionTitle}>{tr.team.messages.title}</Text>
        <Text style={styles.sectionSubtitle}>{tr.team.messages.subtitle}</Text>
      </View>

      <View style={styles.composerCard}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={onChangeDraft}
          placeholder={tr.team.messages.composerPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!draft.trim() || submitting) && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={!draft.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <>
              <MaterialIcons name="send" size={18} color={theme.colors.textInverse} />
              <Text style={styles.sendButtonText}>{tr.team.messages.sendAction}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {error && messages.length > 0 && (
        <View style={styles.inlineWarning}>
          <MaterialIcons name="error-outline" size={18} color={theme.colors.warningText} />
          <Text style={styles.inlineWarningText}>{tr.team.messages.refreshFailed}</Text>
        </View>
      )}

      {loading && messages.length === 0 ? (
        renderStateCard({
          icon: 'forum',
          title: tr.team.messages.loadingTitle,
          description: tr.team.messages.loadingSubtitle,
        })
      ) : error && messages.length === 0 ? (
        renderStateCard({
          icon: 'forum',
          title: tr.team.messages.errorTitle,
          description: error,
          actionLabel: 'Tekrar dene',
        })
      ) : messages.length === 0 ? (
        renderStateCard({
          icon: 'forum',
          title: tr.team.messages.emptyTitle,
          description: tr.team.messages.emptySubtitle,
        })
      ) : (
        messages.map((message) => {
          const isOwnMessage = currentUserId && message.sender_id === currentUserId;
          return (
            <View
              key={message.id}
              style={[styles.messageCard, isOwnMessage && styles.messageCardOwn]}
            >
              <View style={styles.messageHeader}>
                <Text style={styles.messageAuthor}>
                  {message.sender_name || tr.team.messages.authorFallback}
                </Text>
                <Text style={styles.messageTime}>{formatMessageTime(message.created_at)}</Text>
              </View>
              <Text style={styles.messageBody}>{message.body}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    sectionStack: { gap: 14, paddingBottom: 120 },
    sectionTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
    sectionSubtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, marginTop: 4 },
    composerCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 12,
      ...theme.shadows.sm,
    },
    input: {
      minHeight: 90,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.colors.textPrimary,
      fontSize: 14,
    },
    sendButton: {
      alignSelf: 'flex-end',
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: { color: theme.colors.textInverse, fontSize: 13, fontWeight: '700' },
    inlineWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: theme.colors.warningLight,
    },
    inlineWarningText: { flex: 1, fontSize: 12, color: theme.colors.warningText, fontWeight: '600' },
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
      ...theme.shadows.sm,
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
    messageCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 14,
      gap: 8,
      ...theme.shadows.sm,
    },
    messageCardOwn: {
      borderColor: `${theme.colors.primary}44`,
      backgroundColor: theme.colors.primaryLight,
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    messageAuthor: { flex: 1, fontSize: 13, fontWeight: '800', color: theme.colors.textPrimary },
    messageTime: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
    messageBody: { fontSize: 14, lineHeight: 21, color: theme.colors.textPrimary },
  })
);
