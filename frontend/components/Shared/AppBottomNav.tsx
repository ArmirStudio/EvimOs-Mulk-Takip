import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  Easing,
} from 'react-native-reanimated';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { useUserData } from '../../hooks/useUserData';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Role = 'admin' | 'agent' | 'landlord' | 'tenant' | 'employee';
type NavItem = { label: string; icon: IconName; path: string };

const ROLE_NAV_ITEMS: Record<Role, NavItem[]> = {
  admin: [
    { label: 'Panel', icon: 'analytics-outline', path: '/admin/dashboard' },
    { label: 'Şirketler', icon: 'business-outline', path: '/admin/companies' },
    { label: 'İletişim', icon: 'people-outline', path: '/admin/contacts' },
    { label: 'Dev', icon: 'construct-outline', path: '/admin/dev-tools' },
    { label: 'Ayarlar', icon: 'settings-outline', path: '/admin/settings' },
  ],
  agent: [
    { label: 'Ana Sayfa', icon: 'home-outline', path: '/agent/dashboard' },
    { label: 'Mülkler', icon: 'business-outline', path: '/agent/properties' },
    { label: 'Talepler', icon: 'construct-outline', path: '/agent/maintenance' },
    { label: 'Ekibim', icon: 'people-outline', path: '/agent/team' },
    { label: 'Profil', icon: 'person-outline', path: '/agent/settings' },
  ],
  employee: [
    { label: 'Ana Sayfa', icon: 'home-outline', path: '/agent/dashboard' },
    { label: 'Mülkler', icon: 'business-outline', path: '/agent/properties' },
    { label: 'Talepler', icon: 'construct-outline', path: '/agent/maintenance' },
    { label: 'Ekibim', icon: 'people-outline', path: '/agent/team' },
    { label: 'Profil', icon: 'person-outline', path: '/agent/settings' },
  ],
  landlord: [
    { label: 'Ana Sayfa', icon: 'home-outline', path: '/landlord/dashboard' },
    { label: 'Mülkler', icon: 'business-outline', path: '/landlord/properties' },
    { label: 'Talepler', icon: 'construct-outline', path: '/landlord/maintenance' },
    { label: 'Profil', icon: 'person-outline', path: '/landlord/settings' },
  ],
  tenant: [
    { label: 'Ana Sayfa', icon: 'home-outline', path: '/tenant/dashboard' },
    { label: 'Evim', icon: 'home-outline', path: '/tenant/property' },
    { label: 'Taleplerim', icon: 'construct-outline', path: '/tenant/maintenance' },
    { label: 'Profil', icon: 'person-outline', path: '/tenant/settings' },
  ],
};

type FabAction = {
  icon: string;
  label: string;
  route: string;
  position: 'left' | 'center' | 'right';
  large?: boolean;
};

const FAB_ACTIONS: Partial<Record<Role, FabAction[]>> = {
  admin: [{ icon: 'domain-add', label: 'Yeni Şirket', route: '/admin/create-company', position: 'center', large: true }],
};

const HIDDEN_FOR_LOCAL_NAV: Record<string, true> = {
  '/admin/create-company': true,
  '/agent/create-property': true,
  '/agent/edit-property': true,
  '/agent/create-maintenance': true,
  '/agent/property-detail': true,
  '/agent/contact-detail': true,
  '/agent/create-contact': true,
  '/agent/edit-contact': true,
  '/agent/invite': true,
  '/agent/pending-invite-detail': true,
  '/agent/team-member': true,
  '/agent/task-form': true,
  '/agent/team-messages': true,
  '/landlord/property-detail': true,
  '/landlord/tenants': true,
  '/tenant/maintenance-request': true,
  '/tenant/property-detail': true,
  '/tenant/upload-receipt': true,
};

function getRole(pathname: string): Role | null {
  if (pathname.startsWith('/admin/')) return 'admin';
  if (pathname.startsWith('/agent/')) return 'agent';
  if (pathname.startsWith('/landlord/')) return 'landlord';
  if (pathname.startsWith('/tenant/')) return 'tenant';
  return null;
}

export function shouldShowGlobalBottomNav(pathname: string): boolean {
  const role = getRole(pathname);
  if (!role) return false;
  return !HIDDEN_FOR_LOCAL_NAV[pathname];
}

function matchActivePath(pathname: string, itemPath: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

type AnimatedNavButtonProps = {
  active: boolean;
  label: string;
  icon: IconName;
  locked?: boolean;
  onPress: () => void;
};

function AnimatedNavButton({ active, label, icon, locked, onPress }: AnimatedNavButtonProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const scale = useSharedValue(active ? 1 : 0.94);

  useEffect(() => {
    scale.value = withSpring(active ? 1 : 0.94, {
      damping: 14,
      stiffness: 180,
      mass: 0.6,
    });
  }, [active, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const color = active ? theme.colors.copper : theme.colors.textMuted;
  const displayIcon = locked ? 'lock-closed-outline' : (active ? (icon.replace('-outline', '') as IconName) : icon);

  return (
    <Pressable onPress={onPress} style={styles.navButton}>
      <Animated.View style={[styles.navInner, active && styles.navInnerActive, animatedStyle]}>
        <Ionicons name={displayIcon as IconName} size={22} color={color} />
        <Text style={[styles.navLabel, active && styles.navLabelActive, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function AppBottomNav() {
  const theme = useAppTheme();
  const styles = useStyles();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { userData } = useUserData();
  const routeRole = getRole(pathname);
  const role = userData?.role === 'employee' ? 'employee' : routeRole;
  const [fabOpen, setFabOpen] = useState(false);
  const fabProgress = useSharedValue(0);
  const fabRotation = useSharedValue(0);
  const isPendingInviteUser =
    (userData?.role === 'tenant' || userData?.role === 'landlord') && userData.status === 'pending';

  const toggleFab = () => {
    if (fabOpen) {
      fabProgress.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      fabRotation.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      setTimeout(() => setFabOpen(false), 220);
    } else {
      setFabOpen(true);
      fabProgress.value = withSpring(1, { damping: 25, stiffness: 200, mass: 0.8 });
      fabRotation.value = withTiming(45, { duration: 260, easing: Easing.out(Easing.back(1.2)) });
    }
  };

  const animatedMainFab = useAnimatedStyle(() => ({
    transform: [{ rotate: `${fabRotation.value}deg` }],
  }));

  const animatedOverlay = useAnimatedStyle(() => ({
    opacity: fabProgress.value,
    pointerEvents: fabProgress.value > 0 ? 'auto' : 'none' as any,
  }));

  const animatedLeftBtn = useAnimatedStyle(() => {
    const p = fabProgress.value;
    const translateX = interpolate(p, [0, 1], [0, -90], Extrapolate.CLAMP);
    const translateY = interpolate(p, [0, 1], [0, -80], Extrapolate.CLAMP);
    const scale = interpolate(p, [0, 0.5, 1], [0.4, 0.9, 1], Extrapolate.CLAMP);
    return { opacity: interpolate(p, [0, 0.3, 1], [0, 0.6, 1], Extrapolate.CLAMP), transform: [{ translateX }, { translateY }, { scale }] };
  });

  const animatedTopBtn = useAnimatedStyle(() => {
    const p = Math.max(0, fabProgress.value - 0.08) * (1 / 0.92);
    const translateY = interpolate(p, [0, 1], [0, -130], Extrapolate.CLAMP);
    const scale = interpolate(p, [0, 0.5, 1], [0.4, 0.95, 1], Extrapolate.CLAMP);
    return { opacity: interpolate(p, [0, 0.3, 1], [0, 0.6, 1], Extrapolate.CLAMP), transform: [{ translateY }, { scale }] };
  });

  const animatedRightBtn = useAnimatedStyle(() => {
    const p = fabProgress.value;
    const translateX = interpolate(p, [0, 1], [0, 90], Extrapolate.CLAMP);
    const translateY = interpolate(p, [0, 1], [0, -80], Extrapolate.CLAMP);
    const scale = interpolate(p, [0, 0.5, 1], [0.4, 0.9, 1], Extrapolate.CLAMP);
    return { opacity: interpolate(p, [0, 0.3, 1], [0, 0.6, 1], Extrapolate.CLAMP), transform: [{ translateX }, { translateY }, { scale }] };
  });

  if (!role || !shouldShowGlobalBottomNav(pathname)) {
    return null;
  }

  const navItems = ROLE_NAV_ITEMS[role];
  const fabActions = isPendingInviteUser ? [] : (role ? FAB_ACTIONS[role] : undefined);
  const hasFab = !!fabActions && fabActions.length > 0;
  const handlePrimaryNavigation = (path: string) => {
    if (isPendingInviteUser && !path.endsWith('/dashboard')) {
      Alert.alert('Hesap onayı bekleniyor', 'Hesabınız onaylanınca bu alan açılacak.');
      return;
    }
    if (matchActivePath(pathname, path)) {
      return;
    }

    router.replace(path as never);
  };

  return (
    <>
      {hasFab && fabOpen && (
        <Animated.View style={[styles.overlay, animatedOverlay]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={toggleFab} />
        </Animated.View>
      )}

      <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <BlurView
          intensity={80}
          tint={theme.colors.background === theme.colors.dark ? 'dark' : 'light'}
          style={styles.blurContainer}
        >
          <View style={styles.navContainer}>
          {hasFab ? (
            <>
              {navItems.slice(0, 2).map((item) => (
                <AnimatedNavButton
                  key={item.path}
                  active={matchActivePath(pathname, item.path)}
                  label={item.label}
                  icon={item.icon}
                  locked={isPendingInviteUser && !item.path.endsWith('/dashboard')}
                  onPress={() => handlePrimaryNavigation(item.path)}
                />
              ))}

              <View style={styles.fabPlaceholder}>
                <View style={styles.fabWrapper}>
                  {fabOpen && (
                    <View style={styles.radialContainer} pointerEvents="box-none">
                      {fabActions?.filter(a => a.position === 'left').map(action => (
                        <Animated.View key={action.route} style={[styles.radialItemContainer, animatedLeftBtn]}>
                          <TouchableOpacity
                            style={styles.radialBtn}
                            onPress={() => { toggleFab(); router.push(action.route as never); }}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name={action.icon as any} size={24} color={theme.colors.primary} />
                          </TouchableOpacity>
                          <View style={styles.radialLabel}><Text style={styles.radialLabelText}>{action.label}</Text></View>
                        </Animated.View>
                      ))}

                      {fabActions?.filter(a => a.position === 'center').map(action => (
                        <Animated.View key={action.route} style={[styles.radialItemContainer, animatedTopBtn]}>
                          <TouchableOpacity
                            style={[styles.radialBtn, { width: 64, height: 64, borderRadius: 32 }]}
                            onPress={() => { toggleFab(); router.push(action.route as never); }}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name={action.icon as any} size={28} color={theme.colors.primary} />
                          </TouchableOpacity>
                          <View style={[styles.radialLabel, { marginTop: 8 }]}><Text style={styles.radialLabelText}>{action.label}</Text></View>
                        </Animated.View>
                      ))}

                      {fabActions?.filter(a => a.position === 'right').map(action => (
                        <Animated.View key={action.route} style={[styles.radialItemContainer, animatedRightBtn]}>
                          <TouchableOpacity
                            style={styles.radialBtn}
                            onPress={() => { toggleFab(); router.push(action.route as never); }}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name={action.icon as any} size={24} color={theme.colors.primary} />
                          </TouchableOpacity>
                          <View style={styles.radialLabel}><Text style={styles.radialLabelText}>{action.label}</Text></View>
                        </Animated.View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity style={styles.fab} onPress={toggleFab} activeOpacity={0.9}>
                    <Animated.View style={animatedMainFab}>
                      <MaterialIcons name="add" size={32} color={theme.colors.textInverse} />
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>

              {navItems.slice(2).map((item) => (
                <AnimatedNavButton
                  key={item.path}
                  active={matchActivePath(pathname, item.path)}
                  label={item.label}
                  icon={item.icon}
                  locked={isPendingInviteUser && !item.path.endsWith('/dashboard')}
                  onPress={() => handlePrimaryNavigation(item.path)}
                />
              ))}
            </>
          ) : (
            navItems.map((item) => (
              <AnimatedNavButton
                key={item.path}
                active={matchActivePath(pathname, item.path)}
                label={item.label}
                icon={item.icon}
                locked={isPendingInviteUser && !item.path.endsWith('/dashboard')}
                onPress={() => handlePrimaryNavigation(item.path)}
              />
            ))
          )}
          </View>
        </BlurView>
      </View>
    </>
  );
}

export const GLOBAL_NAV_BASE_HEIGHT = 82;
export const GLOBAL_NAV_EXTRA_GAP = 24;

export function getGlobalBottomNavInset(bottomSafeArea = 0): number {
  return GLOBAL_NAV_BASE_HEIGHT + Math.max(bottomSafeArea, 16) + GLOBAL_NAV_EXTRA_GAP;
}

export function useGlobalBottomNavInset(): number {
  const insets = useSafeAreaInsets();
  return getGlobalBottomNavInset(insets.bottom);
}

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      zIndex: 100,
    },
    blurContainer: {
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: theme.colors.copper,
      backgroundColor: 'transparent',
    },
    navContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      paddingVertical: 8,
    },
    navButton: {
      flex: 1,
      alignItems: 'center',
    },
    navInner: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      minWidth: 56,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 18,
      gap: 4,
    },
    navInnerActive: {
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: `${theme.colors.success}55`,
      shadowColor: theme.colors.success,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
      elevation: 2,
    },
    navLabel: {
      fontSize: 10,
      fontWeight: '700',
    },
    navLabelActive: {
      fontWeight: '800',
    },
    fabPlaceholder: {
      width: 64,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabWrapper: {
      position: 'absolute',
      bottom: 10,
      alignItems: 'center',
    },
    fab: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: theme.colors.copper,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: theme.colors.background,
      ...theme.shadows.md,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlayStrong,
      zIndex: 90,
    },
    radialContainer: {
      position: 'absolute',
      bottom: 40,
      alignItems: 'center',
      justifyContent: 'center',
      width: 0,
      height: 0,
    },
    radialItemContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    radialBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.md,
    },
    radialLabel: {
      backgroundColor: theme.colors.darkSecondary,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      marginTop: 6,
    },
    radialLabelText: {
      color: theme.colors.textInverse,
      fontSize: 11,
      fontWeight: '700',
    },
  }),
);
