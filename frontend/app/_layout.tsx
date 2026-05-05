import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetInfo from '@react-native-community/netinfo';
import AppBottomNav, {
  shouldShowGlobalBottomNav,
  GLOBAL_NAV_BASE_HEIGHT,
} from '../components/Shared/AppBottomNav';
import {
  AppThemeProvider,
  useAppTheme,
  useThemeController,
} from './theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRootStackOptions } from '../utils/navigationTransitions';
import { mapBackendThemeToPreference } from '../services/preferences';
import { isSupabaseConfigured, supabase } from '../services/supabase';

import { usePushNotifications } from '../hooks/usePushNotifications';
import { useUserData } from '../hooks/useUserData';
import { loadPreferencesOnce } from '../hooks/usePreferences';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import NoInternetOverlay from '../components/Shared/NoInternetOverlay';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore duplicate calls during fast refresh.
});

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootNavigator />
    </AppThemeProvider>
  );
}

function RootNavigator() {
  const { userData } = useUserData();
  const theme = useAppTheme();
  const { isReady, resolvedTheme, preference, setPreference, setBrandOverride } = useThemeController();
  const { isConnected } = useNetworkStatus();
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  usePushNotifications(userData?.id);

  const handleRetry = async () => {
    setIsCheckingConnection(true);
    try {
      await NetInfo.fetch();
    } finally {
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    const shouldUseBrand =
      userData?.role === 'tenant' || userData?.role === 'landlord';

    if (shouldUseBrand && userData?.effectiveBrand?.primary) {
      setBrandOverride({
        primary: userData.effectiveBrand.primary,
        secondary: userData.effectiveBrand.secondary,
      });
      return;
    }

    setBrandOverride(null);
  }, [
    setBrandOverride,
    userData?.role,
    userData?.effectiveBrand?.primary,
    userData?.effectiveBrand?.secondary,
  ]);

  useEffect(() => {
    loadPreferencesOnce();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void SplashScreen.hideAsync().catch(() => {
      // Splash may already be hidden during hot reload.
    });
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !userData?.preferred_theme) {
      return;
    }

    const nextPreference = mapBackendThemeToPreference(userData.preferred_theme);
    if (nextPreference === preference) {
      return;
    }

    void setPreference(nextPreference);
  }, [isReady, preference, setPreference, userData?.preferred_theme]);

  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showGlobalNav = shouldShowGlobalBottomNav(pathname);
  const bottomPadding = showGlobalNav ? GLOBAL_NAV_BASE_HEIGHT + Math.max(insets.bottom, 16) : 0;

  useEffect(() => {
    const isPendingInviteUser =
      (userData?.role === 'tenant' || userData?.role === 'landlord') && userData.status === 'pending';
    if (!isPendingInviteUser) {
      return;
    }

    if (pathname.startsWith('/tenant/') && pathname !== '/tenant/dashboard') {
      router.replace('/tenant/dashboard' as any);
    }
    if (pathname.startsWith('/landlord/') && pathname !== '/landlord/dashboard') {
      router.replace('/landlord/dashboard' as any);
    }
  }, [pathname, router, userData?.role, userData?.status]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') {
        return;
      }

      if (pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/set-password') {
        return;
      }

      router.replace('/login' as any);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const handleDeepLink = async (url: string) => {
      if (!url.includes('auth/callback')) {
        return;
      }

      const parsed = Linking.parse(url);
      const token_hash = parsed.queryParams?.token_hash as string | undefined;
      const type = parsed.queryParams?.type as string | undefined;

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any });
        if (!error) {
          router.replace('/set-password' as any);
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [router]);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, paddingBottom: bottomPadding }}>
        <Stack
          key={resolvedTheme}
          screenOptions={({ route }) => getRootStackOptions(theme, route.name)}
        />
      </View>
      <AppBottomNav />
      <NoInternetOverlay
        visible={!isConnected}
        onRetry={handleRetry}
        isChecking={isCheckingConnection}
      />
    </GestureHandlerRootView>
  );
}
