import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, StatusBar, FlatList } from 'react-native';
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
import { useGlobalBottomNavInset } from './AppBottomNav';

const TIMING_HIDE = { duration: 280, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
const TIMING_SHOW = { duration: 320, easing: Easing.bezier(0.0, 0.0, 0.2, 1) };
const SCROLL_THRESHOLD = 120;
const SCROLL_DEAD_ZONE = 4;

interface AnimatedHeaderFlatListProps {
  headerContent: ReactNode;
  data: any[];
  renderItem: any;
  keyExtractor: (item: any, index: number) => string;
  headerStyle?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  refreshControl?: any;
  ListHeaderComponent?: any;
  ListEmptyComponent?: any;
  headerHeight?: number;
  transparentHeader?: boolean;
  glassHeader?: boolean;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function AnimatedHeaderFlatList({
  headerContent,
  data,
  renderItem,
  keyExtractor,
  headerStyle,
  contentContainerStyle,
  refreshControl,
  ListHeaderComponent,
  ListEmptyComponent,
  headerHeight = 56,
  transparentHeader = false,
  glassHeader = false,
}: AnimatedHeaderFlatListProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const bottomNavInset = useGlobalBottomNavInset();
  const lastScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const totalHeaderHeight = headerHeight + insets.top + (transparentHeader ? 0 : 12);
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
    <View style={styles.container}>
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

      <AnimatedFlatList
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: transparentHeader ? 0 : totalHeaderHeight },
          contentContainerStyle,
          { paddingBottom: bottomNavInset },
        ]}
        refreshControl={refreshControl}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
      />
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: { flex: 1 },
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
    listContent: {
      paddingBottom: 100,
    },
  }),
);
