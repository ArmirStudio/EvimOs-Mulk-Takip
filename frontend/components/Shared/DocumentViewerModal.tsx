import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '../../app/translations';
import { createThemedStyles, useAppTheme } from '../../app/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  url?: string | null;
  urls?: string[];
  isPdf?: boolean;
  loading?: boolean;
};

export default function DocumentViewerModal({
  visible,
  onClose,
  title,
  url,
  urls,
  isPdf = false,
  loading = false,
}: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const mediaUrls = React.useMemo(
    () => (urls && urls.length > 0 ? urls : url ? [url] : []),
    [url, urls]
  );
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (visible) {
      setActiveIndex(0);
    }
  }, [visible, mediaUrls.length]);

  const handleOpenExternally = React.useCallback(async () => {
    const currentUrl = mediaUrls[activeIndex];
    if (!currentUrl) {
      return;
    }
    await WebBrowser.openBrowserAsync(currentUrl);
  }, [activeIndex, mediaUrls]);

  const renderImage = ({ item }: { item: string }) => (
    <View style={styles.imagePage}>
      <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTapArea} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel={tr.common.close}>
              <MaterialIcons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              {title || tr.receipts.document}
            </Text>
            <TouchableOpacity
              onPress={handleOpenExternally}
              style={styles.iconBtn}
              disabled={!mediaUrls[activeIndex]}
              accessibilityLabel={tr.common.openExternal}
            >
              <MaterialIcons
                name="open-in-new"
                size={22}
                color={mediaUrls[activeIndex] ? theme.colors.primary : theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : mediaUrls.length === 0 ? (
            <View style={styles.centered}>
              <MaterialIcons name="insert-drive-file" size={44} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>{tr.common.documentUnavailable}</Text>
            </View>
          ) : isPdf ? (
            <View style={styles.pdfShell}>
              <WebView source={{ uri: mediaUrls[0] }} style={styles.viewer} startInLoadingState />
            </View>
          ) : (
            <View style={styles.imageViewer}>
              <FlatList
                data={mediaUrls}
                keyExtractor={(item, index) => `${item}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                renderItem={renderImage}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setActiveIndex(nextIndex);
                }}
              />

              {mediaUrls.length > 1 && (
                <View style={styles.counterPill}>
                  <Text style={styles.counterText}>
                    {activeIndex + 1} / {mediaUrls.length}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.modalBackdrop,
      justifyContent: 'flex-end',
    },
    overlayTapArea: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      maxHeight: SCREEN_HEIGHT * 0.8,
      minHeight: SCREEN_HEIGHT * 0.52,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
    },
    handle: {
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    title: {
      flex: 1,
      marginHorizontal: 12,
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    imageViewer: {
      flex: 1,
      minHeight: SCREEN_HEIGHT * 0.42,
      backgroundColor: theme.colors.background,
    },
    imagePage: {
      width: SCREEN_WIDTH,
      minHeight: SCREEN_HEIGHT * 0.42,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    viewer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    pdfShell: {
      flex: 1,
      marginHorizontal: 12,
      marginVertical: 12,
      overflow: 'hidden',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    image: {
      width: SCREEN_WIDTH - 48,
      height: SCREEN_HEIGHT * 0.42,
    },
    counterPill: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: theme.colors.darkSecondary,
    },
    counterText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textInverse,
    },
  })
);
