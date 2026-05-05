import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { remindPendingInvite } from '../../services/appApi';
import { signOut, type UserData } from '../../hooks/useUserData';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function formatRemaining(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} dk`;
  return `${hours} sa ${minutes} dk`;
}

function getNextAllowedAt(lastRemindedAt?: string | null) {
  if (!lastRemindedAt) return null;
  const last = new Date(lastRemindedAt).getTime();
  if (Number.isNaN(last)) return null;
  return last + COOLDOWN_MS;
}

export default function PendingApprovalScreen({
  userData,
  onReminderSent,
}: {
  userData: UserData;
  onReminderSent: () => Promise<void> | void;
}) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const nextAllowedAt = useMemo(
    () => getNextAllowedAt(userData.inviteLastRemindedAt),
    [userData.inviteLastRemindedAt]
  );
  const remainingMs = nextAllowedAt ? nextAllowedAt - now : 0;
  const isCoolingDown = remainingMs > 0;
  const officeName = userData.inviteOfficeName || 'Emlak ofisi';
  const roleLabel = userData.role === 'landlord' ? 'ev sahibi' : 'kiraci';

  const handleRemind = async () => {
    if (sending || isCoolingDown) return;
    setSending(true);
    setSentMessage('');
    try {
      const response = await remindPendingInvite();
      if (!response.success) {
        setSentMessage(`Tekrar göndermek için ${formatRemaining(response.cooldown_seconds * 1000)} kaldı.`);
      } else {
        setSentMessage('Hatırlatma gönderildi. Onaylandığınızda bildirim alacaksınız.');
        await onReminderSent();
      }
    } catch (error: any) {
      Alert.alert('Hatırlatma gönderilemedi', error?.detail || error?.message || 'Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login' as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="hourglass-top" size={34} color={theme.colors.primary} />
        </View>
        <Text style={styles.eyebrow}>{roleLabel.toLocaleUpperCase('tr-TR')} DAVETI</Text>
        <Text style={styles.title}>{officeName} davetinizi aldı, hesabınız onay bekliyor.</Text>
        <Text style={styles.body}>
          Onaylandığınızda uygulamadaki ilgili ekranlar açılacak. Şu anda sadece bu durum ekranını görebilirsiniz.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, (sending || isCoolingDown) && styles.primaryButtonDisabled]}
          onPress={handleRemind}
          disabled={sending || isCoolingDown}
          activeOpacity={0.86}
        >
          {sending ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <>
              <MaterialIcons name={isCoolingDown ? 'lock-clock' : 'notifications-active'} size={20} color={theme.colors.textInverse} />
              <Text style={styles.primaryButtonText}>
                {isCoolingDown
                  ? `Tekrar göndermek için ${formatRemaining(remainingMs)} kaldı`
                  : 'Emlakçıya Bildirim Gönder'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {sentMessage ? <Text style={styles.feedback}>{sentMessage}</Text> : null}

        <TouchableOpacity style={styles.secondaryButton} onPress={handleSignOut} activeOpacity={0.75}>
          <MaterialIcons name="logout" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.secondaryButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: 120,
      backgroundColor: theme.colors.background,
    },
    panel: {
      alignItems: 'center',
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
      gap: theme.spacing.md,
      ...theme.shadows.md,
    },
    iconWrap: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
      marginBottom: theme.spacing.xs,
    },
    eyebrow: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textMuted,
      letterSpacing: 0.8,
    },
    title: {
      fontSize: theme.fontSize.xxl,
      lineHeight: 30,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    body: {
      fontSize: theme.fontSize.md,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    primaryButton: {
      minHeight: 54,
      width: '100%',
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    primaryButtonDisabled: {
      opacity: 0.68,
    },
    primaryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.bold,
      textAlign: 'center',
    },
    feedback: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.successText,
      textAlign: 'center',
      lineHeight: 19,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.xs,
    },
    secondaryButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
  })
);
