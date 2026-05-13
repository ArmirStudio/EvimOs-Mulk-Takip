import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AdCampaign } from '@shared/campaign';
import { createThemedStyles, useAppTheme } from '../../app/theme';

interface Props {
  visible: boolean;
  ad: AdCampaign | null;
  onCampaignEvent?: (
    campaign: AdCampaign,
    eventType: 'click' | 'link_open',
    placement: string
  ) => Promise<void> | void;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function InterstitialAdModal({ visible, ad, onCampaignEvent, onClose }: Props) {
  const theme = useAppTheme();
  const styles = useStyles();

  const lockSec = ad?.lock_duration ?? 0;
  const widthPct = ad?.modal_width_pct ?? 85;
  const heightPct = ad?.image_height_pct ?? 35;

  const modalWidth = SCREEN_W * (widthPct / 100);
  const imageHeight = SCREEN_H * (heightPct / 100);

  const [countdown, setCountdown] = useState(lockSec);
  const closeOpacity = useRef(new Animated.Value(lockSec > 0 ? 0 : 1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible || !ad) return;

    const lock = ad.lock_duration ?? 0;
    setCountdown(lock);
    closeOpacity.setValue(lock > 0 ? 0 : 1);

    if (lock > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            Animated.timing(closeOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, ad, closeOpacity]);

  if (!ad) return null;

  const closeEnabled = countdown === 0;

  const openLink = async () => {
    if (!ad.link_url) return;
    try {
      await onCampaignEvent?.(ad, 'click', 'interstitial_modal');
    } catch {
      // Analytics must not block the user's navigation.
    }
    try {
      const supported = await Linking.canOpenURL(ad.link_url);
      if (supported) {
        try {
          await onCampaignEvent?.(ad, 'link_open', 'interstitial_modal');
        } catch {
          // Analytics must not block the user's navigation.
        }
        await Linking.openURL(ad.link_url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeEnabled ? onClose : undefined}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { width: modalWidth }]}>
          <Animated.View
            style={[
              styles.closeBtn,
              countdown > 0 && styles.closeBtnLocked,
              { opacity: countdown > 0 ? 1 : closeOpacity },
            ]}
          >
            <TouchableOpacity
              onPress={closeEnabled ? onClose : undefined}
              activeOpacity={closeEnabled ? 0.7 : 1}
              style={styles.closeBtnInner}
            >
              {countdown > 0 ? (
                <Text style={styles.countdownText}>{countdown}</Text>
              ) : (
                <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
              )}
            </TouchableOpacity>
          </Animated.View>

          {ad.image_url ? (
            <Image
              source={{ uri: ad.image_url }}
              style={[styles.image, { height: imageHeight }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder, { height: imageHeight }]}>
              <Ionicons name="megaphone-outline" size={48} color={theme.colors.textMuted} />
            </View>
          )}

          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>{ad.title}</Text>
            {ad.body ? (
              <Text style={styles.body} numberOfLines={4}>{ad.body}</Text>
            ) : null}

            {ad.link_url ? (
              <TouchableOpacity style={styles.linkBtn} onPress={openLink}>
                <Text style={styles.linkBtnText}>Detaylar</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.textInverse} />
              </TouchableOpacity>
            ) : null}

            {countdown > 0 ? (
              <View style={styles.lockRow}>
                <Ionicons name="lock-closed" size={11} color={theme.colors.primary} />
                <Text style={[styles.lockText, { color: theme.colors.primary }]}>
                  {countdown} sn sonra kapatilabilir
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.modalBackdrop || 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      maxWidth: 420,
    },
    closeBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    closeBtnLocked: {
      backgroundColor: theme.colors.primary,
    },
    closeBtnInner: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    countdownText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#fff',
    },
    image: {
      width: '100%',
    },
    imagePlaceholder: {
      backgroundColor: theme.colors.surface2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    body: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    linkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    linkBtnText: {
      color: theme.colors.textInverse,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.bold,
    },
    lockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: 8,
    },
    lockText: {
      fontSize: 10,
      fontWeight: '600',
    },
  })
);
