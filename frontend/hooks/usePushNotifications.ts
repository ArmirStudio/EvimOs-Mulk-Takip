import React from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { isSupabaseConfigured, supabase } from '../services/supabase';
import { getUserBaseRoute } from '../utils/teamPresentation';
import { getUserData } from './useUserData';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function isExpoGoRuntime() {
  const constantsAny = Constants as typeof Constants & { appOwnership?: string };
  return constantsAny.executionEnvironment === 'storeClient' || constantsAny.appOwnership === 'expo';
}

export function usePushNotifications(userId: string | undefined) {
  const [expoPushToken, setExpoPushToken] = React.useState<string | undefined>(undefined);
  const [notification, setNotification] = React.useState<Notifications.Notification | undefined>(undefined);
  const notificationListener = React.useRef<Notifications.Subscription | null>(null);
  const responseListener = React.useRef<Notifications.Subscription | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      return;
    }

    if (isExpoGoRuntime()) {
      console.info('Push notifications are disabled in Expo Go. Use an Android dev build or a physical device.');
      return;
    }

    registerForPushNotificationsAsync().then((token) => {
      setExpoPushToken(token);
      if (token) {
        saveTokenToSupabase(userId, token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((nextNotification) => {
      setNotification(nextNotification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const type = data?.type;
      const id = data?.id;
      const route = data?.route;

      if (typeof route === 'string' && route.startsWith('/')) {
        router.push(route as never);
        return;
      }

      if (!type || !id) return;

      getUserData().then((userData) => {
        if (!userData) return;

        const role = userData.role;
        const baseRoute = getUserBaseRoute(role);

        if (type === 'maintenance') {
          router.push(`/${baseRoute}/maintenance?openId=${id}&openType=maintenance` as never);
          return;
        }

        if (type === 'receipt') {
          if (role === 'tenant') {
            router.push(`/tenant/maintenance?focus=payments&openId=${id}&openType=receipt` as never);
          } else {
            router.push(`/${baseRoute}/receipts?openId=${id}&openType=receipt` as never);
          }
          return;
        }

        if (type === 'task') {
          router.push(`/agent/team?tab=tasks&openTaskId=${id}` as never);
          return;
        }

        if (type === 'announcement') {
          router.push('/agent/team?tab=announcements' as never);
        }
      });
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router, userId]);

  return { expoPushToken, notification };
}

async function saveTokenToSupabase(userId: string, token: string) {
  if (!isSupabaseConfigured) {
    return;
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) console.error('Error saving push token:', error);
  } catch (err) {
    console.error('Push token save error:', err);
  }
}

async function registerForPushNotificationsAsync() {
  if (isExpoGoRuntime()) {
    return undefined;
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }

    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (error) {
      console.error('Error getting push token', error);
    }
  } else {
    console.info('Push notifications require a physical device.');
  }

  return token;
}
