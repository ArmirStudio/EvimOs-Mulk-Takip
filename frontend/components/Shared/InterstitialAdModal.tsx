import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
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

type AdStage = 'mini' | 'expanded';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MINI_H = 96;
const MINI_W = SCREEN_W - 32;
const EXPANDED_W = SCREEN_W * 0.92;

const SPRING_BASE = { damping: 18, stiffness: 200, mass: 0.9 };
const SPRING_BOUNCY = { damping: 12, stiffness: 220, mass: 0.8 };
const SPRING_SLOW = { damping: 20, stiffness: 180, mass: 1 };


export default function InterstitialAdModal({ visible, ad, onCampaignEvent, onClose }: Props) {
  const theme = useAppTheme();
  const styles = useStyles();

  const lockSec = ad?.lock_duration ?? 0;
  const heightPct = ad?.image_height_pct ?? 35;
  const imageHeight = SCREEN_H * (heightPct / 100);

  const [stage, setStage] = useState<AdStage>('mini');
  const [countdown, setCountdown] = useState(lockSec);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shared animation values
  const cardScale = useSharedValue(0.88);
  const cardTranslateY = useSharedValue(80);
  const cardWidth = useSharedValue(MINI_W);
  const backdropOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const closeOpacity = useSharedValue(0);

  const enterMini = useCallback(() => {
    cardScale.value = withSpring(1, SPRING_BOUNCY);
    cardTranslateY.value = withSpring(0, SPRING_BASE);
  }, [cardScale, cardTranslateY]);

  const expandToFull = useCallback((imgH: number) => {
    setStage('expanded');
    cardWidth.value = withSpring(EXPANDED_W, SPRING_BASE);
    cardScale.value = withSpring(1, SPRING_SLOW);
    cardTranslateY.value = withTiming(0, { duration: 200 });
    backdropOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.ease) });
    contentOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
  }, [cardWidth, cardScale, cardTranslateY, backdropOpacity, contentOpacity]);

  const resetValues = useCallback(() => {
    cardScale.value = 0.88;
    cardTranslateY.value = 80;
    cardWidth.value = MINI_W;
    backdropOpacity.value = 0;
    contentOpacity.value = 0;
    closeOpacity.value = 0;
  }, [cardScale, cardTranslateY, cardWidth, backdropOpacity, contentOpacity, closeOpacity]);

  useEffect(() => {
    if (!visible || !ad) return;

    const lock = ad.lock_duration ?? 0;
    setStage('mini');
    setCountdown(lock);
    resetValues();

    // Small delay so modal is rendered before animation starts
    const enterTimer = setTimeout(() => enterMini(), 80);

    if (lock > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            closeOpacity.value = withTiming(1, { duration: 300 });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      closeOpacity.value = withTiming(1, { duration: 400 });
    }

    return () => {
      clearTimeout(enterTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, ad, resetValues, enterMini, closeOpacity]);

  if (!ad) return null;

  const closeEnabled = countdown === 0;

  const handleMiniPress = () => {
    if (stage === 'mini') {
      expandToFull(imageHeight);
    }
  };

  const openLink = async () => {
    if (!ad.link_url) return;
    try {
      await onCampaignEvent?.(ad, 'click', 'interstitial_modal');
    } catch {
      // Analytics must not block navigation.
    }
    try {
      const supported = await Linking.canOpenURL(ad.link_url);
      if (supported) {
        try {
          await onCampaignEvent?.(ad, 'link_open', 'interstitial_modal');
        } catch {
          // Analytics must not block navigation.
        }
        await Linking.openURL(ad.link_url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const handleClose = () => {
    if (!closeEnabled) return;
    onClose();
  };

  // Animated styles
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
    width: cardWidth.value,
  }));

  const isMini = stage === 'mini';

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentFadeStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const closeBtnStyle = useAnimatedStyle(() => ({
    opacity: closeOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeEnabled ? handleClose : undefined}
      statusBarTranslucent
    >
      {/* Backdrop — only visible in expanded stage */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={!isMini && closeEnabled ? handleClose : undefined} />
      </Animated.View>

      {/* Overlay positioning */}
      <View style={[styles.overlay, isMini ? styles.overlayMini : styles.overlayExpanded]}>
        <Animated.View style={[
          styles.card,
          cardAnimStyle,
          isMini ? styles.cardMini : styles.cardExpanded,
          isMini && { height: MINI_H },
        ]}>
          {/* ── MINI BANNER ── */}
          {isMini && (
            <TouchableOpacity activeOpacity={0.88} style={styles.miniBanner} onPress={handleMiniPress}>
              {ad.image_url ? (
                <Image source={{ uri: ad.image_url }} style={styles.miniThumb} resizeMode="cover" />
              ) : (
                <View style={styles.miniThumbPlaceholder}>
                  <Ionicons name="megaphone-outline" size={22} color={theme.colors.primary} />
                </View>
              )}
              <View style={styles.miniText}>
                <Text style={styles.miniTitle} numberOfLines={1}>{ad.title}</Text>
                {ad.body ? (
                  <Text style={styles.miniBody} numberOfLines={1}>{ad.body}</Text>
                ) : null}
              </View>
              <View style={styles.miniChevron}>
                <Ionicons name="chevron-up" size={18} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          )}

          {/* ── EXPANDED MODAL ── */}
          {!isMini && (
            <>
              {/* Close button */}
              <Animated.View style={[styles.closeBtn, countdown > 0 && styles.closeBtnLocked, closeBtnStyle]}>
                <TouchableOpacity
                  onPress={closeEnabled ? handleClose : undefined}
                  activeOpacity={closeEnabled ? 0.7 : 1}
                  style={styles.closeBtnInner}
                >
                  {countdown > 0 ? (
                    <Text style={styles.countdownText}>{countdown}</Text>
                  ) : (
                    <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
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

              <Animated.View style={[styles.content, contentFadeStyle]}>
                <Text style={styles.title} numberOfLines={2}>{ad.title}</Text>
                {ad.body ? (
                  <Text style={styles.body} numberOfLines={4}>{ad.body}</Text>
                ) : null}

                {ad.link_url ? (
                  <TouchableOpacity style={styles.linkBtn} onPress={openLink} activeOpacity={0.82}>
                    <Text style={styles.linkBtnText}>Detayları Gör</Text>
                    <Ionicons name="arrow-forward" size={16} color={theme.colors.textInverse} />
                  </TouchableOpacity>
                ) : null}

                {countdown > 0 ? (
                  <View style={styles.lockRow}>
                    <Ionicons name="lock-closed" size={11} color={theme.colors.primary} />
                    <Text style={[styles.lockText, { color: theme.colors.primary }]}>
                      {countdown} sn sonra kapatılabilir
                    </Text>
                  </View>
                ) : null}
              </Animated.View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    backdrop: {
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    overlay: {
      flex: 1,
      alignItems: 'center',
    },
    overlayMini: {
      justifyContent: 'flex-end',
      paddingBottom: 28,
    },
    overlayExpanded: {
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    cardMini: {
      borderRadius: theme.borderRadius.xl,
    },
    cardExpanded: {
      width: EXPANDED_W,
      borderRadius: theme.borderRadius.xl,
    },
    // ── Mini Banner ──
    miniBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
      height: MINI_H,
    },
    miniThumb: {
      width: 60,
      height: 60,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface2,
      flexShrink: 0,
    },
    miniThumbPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    miniText: {
      flex: 1,
      gap: 4,
    },
    miniTitle: {
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    miniBody: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    miniChevron: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    // ── Expanded ──
    closeBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.sm,
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
      gap: theme.spacing.sm,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    body: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
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
      marginTop: theme.spacing.xs,
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
      marginTop: theme.spacing.xs,
    },
    lockText: {
      fontSize: 10,
      fontWeight: '600',
    },
  })
);
