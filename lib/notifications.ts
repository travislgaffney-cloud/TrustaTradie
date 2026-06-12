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

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);
}
