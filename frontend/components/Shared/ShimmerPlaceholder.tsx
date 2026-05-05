import React, { useEffect } from 'react';
import { StyleSheet, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { createThemedStyles, useAppTheme } from '../../app/theme';

interface ShimmerProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    shimmer: {
      overflow: 'hidden',
      backgroundColor: theme.colors.surface2,
    },
  })
);

export default function ShimmerPlaceholder({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: ShimmerProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [theme.colors.surface2, theme.colors.surface]
    );

    return {
      backgroundColor,
    };
  });

  return (
    <Animated.View
      style={[
        styles.shimmer,
        { width, height, borderRadius },
        style,
        animatedStyle,
      ]}
    />
  );
}
