import React, { ReactNode, useState } from 'react';
import { StyleSheet, ViewStyle, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createThemedStyles, useAppTheme } from '../../app/theme';

const TIMING_HIDE = { duration: 280, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
const TIMING_SHOW = { duration: 320, easing: Easing.bezier(0.0, 0.0, 0.2, 1) };
const SCROLL_THRESHOLD = 100;
const SCROLL_DEAD_ZONE = 3;

interface AnimatedHeaderScrollViewProps {
  headerContent: ReactNode;
  children: ReactNode;
  headerStyle?: ViewStyle;
  scrollContentStyle?: ViewStyle;
  refreshControl?: any;
  stickySubHeader?: ReactNode;
  transparentHeader?: boolean;
  glassHeader?: boolean;
  headerHeight?: number;
}

export default function AnimatedHeaderScrollView({
  headerContent,
  children,
  headerStyle,
  scrollContentStyle,
  refreshControl,
  stickySubHeader,
  transparentHeader = false,
  glassHeader = false,
  headerHeight = 60,
}: AnimatedHeaderScrollViewProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const lastScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const [stickySubHeaderHeight, setStickySubHeaderHeight] = useState(0);

  const totalHeaderHeight = headerHeight + insets.top + 12;
  const isDark = theme.colors.background === '#0C121C';

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;

      if (currentY < 0) {
        lastScrollY.value = currentY;
        return;
      }

      if (currentY <= SCROLL_THRESHOLD) {
        headerTranslateY.value = withTiming(0, TIMING_SHOW);
      } else if (diff > SCROLL_DEAD_ZONE) {
        headerTranslateY.value = withTiming(-totalHeaderHeight, TIMING_HIDE);
      } else if (diff < -SCROLL_DEAD_ZONE) {
        headerTranslateY.value = withTiming(0, TIMING_SHOW);
      }

      lastScrollY.value = currentY;
    },
  });

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      headerTranslateY.value,
      [-totalHeaderHeight, -totalHeaderHeight * 0.3, 0],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateY: headerTranslateY.value }],
      opacity,
    };
  });

  const headerBgColor = transparentHeader || glassHeader ? theme.colors.navGlass : theme.colors.background;

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20),
            backgroundColor: headerBgColor,
          },
          headerStyle,
          animatedHeaderStyle,
        ]}
      >
        {headerContent}
      </Animated.View>

      {stickySubHeader && (
        <Animated.View
          onLayout={e => setStickySubHeaderHeight(e.nativeEvent.layout.height)}
          style={[
          styles.stickySubHeader,
            { top: totalHeaderHeight, backgroundColor: glassHeader ? theme.colors.navGlass : theme.colors.background },
            animatedHeaderStyle,
          ]}
        >
          {stickySubHeader}
        </Animated.View>
      )}

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: transparentHeader ? 0 : totalHeaderHeight + stickySubHeaderHeight },
          scrollContentStyle,
        ]}
        refreshControl={refreshControl}
      >
        {children}
      </Animated.ScrollView>
    </>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      zIndex: 50,
      ...theme.shadows.sm,
    },
    stickySubHeader: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 49,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: 100,
    },
  }),
);
