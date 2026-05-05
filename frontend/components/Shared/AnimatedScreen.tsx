import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '../../app/theme';

interface AnimatedScreenProps {
  children: React.ReactNode;
  type?: 'fade' | 'slide-up' | 'slide-right' | 'none';
  delay?: number;
}

export default function AnimatedScreen({
  children,
  type = 'slide-up',
  delay = 0,
}: AnimatedScreenProps) {
  const theme = useAppTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(type === 'slide-up' ? 20 : type === 'fade' ? 12 : 0);
  const translateX = useSharedValue(type === 'slide-right' ? 30 : 0);
  const scale = useSharedValue(type === 'fade' ? 0.985 : 1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withTiming(1, {
        duration: theme.motion.durationNormal,
        easing: Easing.out(Easing.cubic),
      });

      if (type === 'slide-up') {
        translateY.value = withSpring(0, theme.motion.springGentle);
      }
      if (type === 'slide-right') {
        translateX.value = withSpring(0, theme.motion.springGentle);
      }
      if (type === 'fade') {
        translateY.value = withSpring(0, theme.motion.springGentle);
        scale.value = withTiming(1, {
          duration: theme.motion.durationNormal + 40,
          easing: Easing.out(Easing.cubic),
        });
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [type, delay, theme, opacity, scale, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  if (type === 'none') {
    return <>{children}</>;
  }

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
