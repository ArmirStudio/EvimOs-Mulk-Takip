import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  interpolateColor,
  runOnJS,
  Extrapolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { createThemedStyles, useAppTheme } from '../../app/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 40;
const BUTTON_WIDTH = 80;
const INNER_PADDING = 10;
const MAX_TRANSLATE = (SLIDER_WIDTH / 2) - INNER_PADDING - (BUTTON_WIDTH / 2);
const THRESHOLD = SLIDER_WIDTH * 0.35;

interface ActionSliderProps {
  onApprove: () => void;
  onReject: () => void;
  approveText?: string;
  rejectText?: string;
  disabled?: boolean;
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: '100%',
  },
  container: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  button: {
    width: BUTTON_WIDTH,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.copper,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...theme.shadows.md,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 100,
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    fontSize: 14,
  },
  rejectText: {
    color: theme.colors.error,
  },
  approveText: {
    color: theme.colors.success,
  },
}));

export const ActionSlider: React.FC<ActionSliderProps> = ({
  onApprove,
  onReject,
  approveText = 'Onayla',
  rejectText = 'Reddet',
  disabled = false,
}) => {
  const theme = useAppTheme();
  const styles = useStyles();
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);
  const [triggered, setTriggered] = useState(false);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      if (disabled || triggered) return;
      translateX.value = contextX.value + event.translationX;
    })
    .onEnd(() => {
      if (disabled || triggered) return;

      if (translateX.value > THRESHOLD) {
        translateX.value = withSpring(MAX_TRANSLATE);
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(setTriggered)(true);
        runOnJS(onApprove)();
      } else if (translateX.value < -THRESHOLD) {
        translateX.value = withSpring(-MAX_TRANSLATE);
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Error);
        runOnJS(setTriggered)(true);
        runOnJS(onReject)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {};
  });

  const animatedLeftTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [-THRESHOLD, 0], [1, 0.3], Extrapolate.CLAMP);
    return { opacity };
  });

  const animatedRightTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, THRESHOLD], [0.3, 1], Extrapolate.CLAMP);
    return { opacity };
  });

  return (
    <View style={styles.outerContainer}>
      <Animated.View style={[styles.container, animatedContainerStyle, disabled && styles.disabled]}>
        <Animated.View style={[styles.textContainer, animatedLeftTextStyle]}>
          <MaterialIcons name="close" size={20} color={theme.colors.error} />
          <Text style={[styles.text, styles.rejectText]}>{rejectText}</Text>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.button, animatedButtonStyle]}>
            <MaterialIcons name="swap-horiz" size={32} color="#FFFFFF" />
          </Animated.View>
        </GestureDetector>

        <Animated.View style={[styles.textContainer, animatedRightTextStyle]}>
          <Text style={[styles.text, styles.approveText]}>{approveText}</Text>
          <MaterialIcons name="check" size={20} color={theme.colors.success} />
        </Animated.View>
      </Animated.View>
    </View>
  );
};
