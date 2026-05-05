import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import tr from '../../app/translations';

type Props = {
  visible: boolean;
  onRetry: () => void;
  isChecking: boolean;
};

export default function NoInternetOverlay({ visible, onRetry, isChecking }: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isChecking) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
        ]),
      );
      loopRef.current = loop;
      loop.start();
    } else {
      loopRef.current?.stop();
      loopRef.current = null;
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      loopRef.current?.stop();
    };
  }, [isChecking, scaleAnim]);

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.overlay,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons
            name="wifi-off"
            size={72}
            color={theme.colors.textMuted}
          />
        </Animated.View>

        <Text style={styles.title}>{tr.noInternet.title}</Text>
        <Text style={styles.subtitle}>{tr.noInternet.subtitle}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={onRetry}
          disabled={isChecking}
          activeOpacity={0.75}
        >
          <Text style={styles.buttonText}>
            {isChecking ? tr.common.loading : tr.noInternet.retry}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 9999,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xxxl,
      gap: theme.spacing.lg,
    },
    title: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginTop: theme.spacing.lg,
    },
    subtitle: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    button: {
      marginTop: theme.spacing.lg,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xxxl,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.md,
    },
    buttonText: {
      color: theme.colors.textInverse,
      fontSize: theme.fontSize.base,
      fontWeight: theme.fontWeight.semibold,
    },
  }),
);
