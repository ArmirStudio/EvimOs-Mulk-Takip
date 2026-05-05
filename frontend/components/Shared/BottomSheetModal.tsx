import React, { useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  Animated as RNAnimated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createThemedStyles, useAppTheme } from '../../app/theme';

type BottomSheetModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeightRatio?: number;
  topOffset?: number;
};

const WINDOW_HEIGHT = Dimensions.get('window').height;

export default function BottomSheetModal({
  visible,
  onClose,
  children,
  maxHeightRatio = 0.94,
  topOffset = 12,
}: BottomSheetModalProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new RNAnimated.Value(WINDOW_HEIGHT)).current;

  const sheetHeight = useMemo(() => {
    const availableHeight = WINDOW_HEIGHT - Math.max(insets.top, 20) - topOffset;
    return Math.max(WINDOW_HEIGHT * 0.72, Math.min(WINDOW_HEIGHT * maxHeightRatio, availableHeight));
  }, [insets.top, maxHeightRatio, topOffset]);

  useEffect(() => {
    if (visible) {
      RNAnimated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 16,
      }).start();
    } else {
      RNAnimated.timing(slideAnim, {
        toValue: WINDOW_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [slideAnim, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <RNAnimated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY: slideAnim }],
              backgroundColor: theme.colors.background,
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.content}>{children}</View>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.modalBackdrop,
    },
    sheet: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
      marginTop: 10,
      marginBottom: 6,
    },
    content: {
      flex: 1,
      minHeight: 0,
    },
  }),
);
