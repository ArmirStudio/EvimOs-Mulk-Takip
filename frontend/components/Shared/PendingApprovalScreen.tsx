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
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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

function PulseIcon() {
  const theme = useAppTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 90,
            height: 90,
            borderRadius: 45,
            borderWidth: 2,
            borderColor: `${theme.colors.primary}40`,
          },
          animStyle,
        ]}
      />
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primaryLight,
          borderWidth: 1.5,
          borderColor: `${theme.colors.primary}30`,
        }}
      >
        <MaterialIcons name="hourglass-top" size={34} color={theme.colors.primary} />
      </View>
    </View>
  );
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
    [userData.inviteLastRemindedAt],
  );
  const remainingMs = nextAllowedAt ? nextAllowedAt - now : 0;
  const isCoolingDown = remainingMs > 0;
  const officeName = userData.inviteOfficeName || 'Emlak ofisi';
  const roleLabel = userData.role === 'landlord' ? 'Ev Sahibi' : 'Kiracı';

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
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.panel}>
        {/* Üst aksan çizgisi */}
        <View style={styles.accentBar} />

        <PulseIcon />

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{roleLabel.toUpperCase()} DAVETİ</Text>
          </View>
        </View>

        <Text style={styles.title}>{officeName} davetinizi aldı</Text>
        <Text style={styles.subtitle}>Hesabınız onay bekliyor</Text>
        <Text style={styles.body}>
          Onaylandığınızda ilgili ekranlar açılacak. Emlakçınıza hatırlatma gönderebilirsiniz.
        </Text>

        {/* Hatırlatma Butonu */}
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
              <MaterialIcons
                name={isCoolingDown ? 'lock-clock' : 'notifications-active'}
                size={20}
                color={theme.colors.textInverse}
              />
              <Text style={styles.primaryButtonText}>
                {isCoolingDown
                  ? `${formatRemaining(remainingMs)} sonra tekrar gönder`
                  : 'Emlakçıya Hatırlat'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {sentMessage ? (
          <View style={styles.feedbackRow}>
            <MaterialIcons name="check-circle-outline" size={15} color={theme.colors.success} />
            <Text style={styles.feedback}>{sentMessage}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.75}>
          <MaterialIcons name="logout" size={16} color={theme.colors.textMuted} />
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: 100,
      backgroundColor: theme.colors.background,
    },
    panel: {
      alignItems: 'center',
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.navGlass,
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      paddingTop: 0,
      gap: theme.spacing.sm,
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    accentBar: {
      width: '100%',
      height: 4,
      backgroundColor: theme.colors.primary,
      borderRadius: 0,
      marginBottom: theme.spacing.lg,
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 4,
    },
    badge: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.primary,
      letterSpacing: 1.2,
    },
    title: {
      fontSize: theme.fontSize.xxl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      lineHeight: 30,
    },
    subtitle: {
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    body: {
      fontSize: theme.fontSize.sm,
      lineHeight: 21,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 8,
      marginBottom: 8,
    },
    primaryButton: {
      minHeight: 54,
      width: '100%',
      borderRadius: 18,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      ...theme.shadows.sm,
    },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.bold,
      textAlign: 'center',
      flexShrink: 1,
    },
    feedbackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    feedback: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.success,
      textAlign: 'center',
      lineHeight: 19,
      flex: 1,
    },
    divider: {
      width: '100%',
      height: 1,
      backgroundColor: theme.colors.divider,
      marginVertical: 4,
    },
    signOutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    signOutText: {
      color: theme.colors.textMuted,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
  }),
);
