import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createThemedStyles, useAppTheme } from '../../app/theme';

type DetailSheetScaffoldProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export default function DetailSheetScaffold({
  title,
  onClose,
  children,
  footer,
  contentContainerStyle,
}: DetailSheetScaffoldProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);

  const resolvedContentStyle = useMemo(
    () => [
      styles.scrollContent,
      contentContainerStyle,
      {
        paddingBottom: footer
          ? footerHeight + Math.max(insets.bottom, 16) + 24
          : Math.max(insets.bottom, 24),
      },
    ],
    [contentContainerStyle, footer, footerHeight, insets.bottom, styles.scrollContent]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Kapat">
          <MaterialIcons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={resolvedContentStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="never"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{
          bottom: footer ? footerHeight + Math.max(insets.bottom, 16) : Math.max(insets.bottom, 16),
        }}
      >
        {children}
      </ScrollView>

      {footer ? (
        <View
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface2,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 40,
      height: 40,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      flexGrow: 1,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
  })
);
