import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingPerms = await Notifications.getPermissionsAsync() as any;
  let isGranted: boolean = existingPerms.granted ?? existingPerms.status === 'granted';

  if (!isGranted) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newPerms = await Notifications.requestPermissionsAsync() as any;
    isGranted = newPerms.granted ?? newPerms.status === 'granted';
  }

  if (!isGranted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: '593b69a2-885e-4a2c-b950-46260707acce',
  })).data;
  return token;
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', userId)
    .single();

  if (!profile?.push_token) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: profile.push_token,
        title,
        body,
        data: data ?? {},
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }),
    });
  } catch (e) {
    console.warn('[sendPushToUser] push failed silently:', e);
  }
}
