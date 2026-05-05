import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { signOut, useUserData } from '../../hooks/useUserData';
import { getUserBaseRoute } from '../../utils/teamPresentation';

type OfficeAvatarMenuProps = {
  onNotifications?: () => void;
};

function getInitials(name?: string | null) {
  return (
    name
      ?.split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export default function OfficeAvatarMenu({ onNotifications }: OfficeAvatarMenuProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const { userData } = useUserData();
  const [visible, setVisible] = useState(false);

  const baseRoute = useMemo(() => getUserBaseRoute(userData?.role), [userData?.role]);
  const avatarLabel = getInitials(userData?.full_name);

  const handleClose = () => setVisible(false);

  const handleRoute = (path: string) => {
    handleClose();
    router.push(path as never);
  };

  const handleNotifications = () => {
    handleClose();
    if (onNotifications) {
      onNotifications();
      return;
    }
    router.push(`/${baseRoute}/dashboard?openPanel=notifications` as never);
  };

  const handleSignOut = () => {
    handleClose();
    Alert.alert('Cikis Yap', 'Hesabinizdan cikmak istediginize emin misiniz?', [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Cikis Yap',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login' as never);
        },
      },
    ]);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)} activeOpacity={0.85}>
        {userData?.avatar_url ? (
          <Image source={{ uri: userData.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{avatarLabel}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{userData?.full_name || 'Kullanici'}</Text>
              <Text style={styles.menuSubtitle}>{userData?.email || 'Profil menusu'}</Text>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleRoute(`/${baseRoute}/profile-edit`)}>
              <View style={styles.menuIconBg}>
                <MaterialIcons name="person" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.menuLabel}>Profilim</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
              <View style={styles.menuIconBg}>
                <MaterialIcons name="notifications" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.menuLabel}>Bildirimler</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleRoute(`/${baseRoute}/settings`)}>
              <View style={styles.menuIconBg}>
                <MaterialIcons name="settings" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.menuLabel}>Ayarlar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
              <View style={[styles.menuIconBg, { backgroundColor: theme.colors.errorLight }]}>
                <MaterialIcons name="logout" size={18} color={theme.colors.error} />
              </View>
              <Text style={[styles.menuLabel, { color: theme.colors.error }]}>Cikis</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    trigger: {
      width: 42,
      height: 42,
      borderRadius: 21,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.sm,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    avatarText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '800',
    },
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.modalBackdrop,
      paddingTop: 92,
      paddingHorizontal: 16,
      alignItems: 'flex-end',
    },
    menuCard: {
      width: 256,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      ...theme.shadows.lg,
    },
    menuHeader: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: 6,
    },
    menuTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    menuSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 10,
      paddingVertical: 12,
      borderRadius: 14,
    },
    menuIconBg: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
  })
);
