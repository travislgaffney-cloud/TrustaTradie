import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { NotificationType } from '@/types/database';

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

/**
 * Writes the in-app notification row and sends the push in one call, embedding
 * `type` into the push payload's data so a tapped OS notification can be routed
 * (the `notifications` table already has `type` as its own column, so it's left
 * out of the row's `data` to avoid duplicating it there).
 */
export async function notifyUser(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  const { userId, type, title, body, data } = params;

  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data: data ?? null,
    is_read: false,
  });

  await sendPushToUser(userId, title, body, { ...data, type });
}

type Role = 'customer' | 'tradie';

/**
 * Maps a notification's type/data to the in-app route it should open, mirroring
 * the per-role handleNotificationPress switches. Shared by the in-app alerts list
 * and by the OS push-tap router so both stay in sync.
 */
export function getNotificationRoute(
  type: NotificationType,
  data: Record<string, string> | null | undefined,
  role: Role
): string | null {
  if (role === 'customer') {
    switch (type) {
      case 'new_quote_received':
        return data?.job_id ? `/(customer)/jobs/${data.job_id}/quotes?from=notifications` : null;
      case 'site_visit_requested':
      case 'site_visit_completed':
        return data?.job_id ? `/(customer)/jobs/${data.job_id}?from=notifications` : null;
      case 'quote_accepted':
      case 'quote_rejected':
      case 'job_started':
      case 'job_completed':
        return data?.job_id ? `/(customer)/jobs/${data.job_id}?from=notifications` : null;
      case 'new_message':
        return data?.conversation_id ? `/(customer)/messages/${data.conversation_id}?from=notifications` : null;
      case 'payment_released':
        return data?.job_id ? `/(customer)/payments/${data.job_id}?from=notifications` : '/(customer)/payments';
      case 'rating_received':
        return data?.job_id ? `/rate/${data.job_id}` : null;
      default:
        return null;
    }
  }

  switch (type) {
    case 'quote_accepted':
    case 'quote_rejected':
      return data?.job_id ? '/(tradie)/my-quotes' : null;
    case 'new_quote_received':
      return data?.job_id ? `/(tradie)/jobs/${data.job_id}?from=notifications` : null;
    case 'site_visit_requested':
      return data?.job_id ? `/(tradie)/jobs/${data.job_id}?from=notifications` : null;
    case 'job_started':
    case 'job_completed':
      return '/(tradie)/my-quotes';
    case 'payment_released':
      return '/(tradie)/earnings';
    case 'new_job_nearby':
      return '/(tradie)/jobs';
    case 'new_message':
      return data?.conversation_id ? `/(tradie)/messages/${data.conversation_id}?from=notifications` : null;
    case 'rating_received':
      return '/(tradie)/profile';
    case 'reward_slip_approved':
    case 'reward_slip_rejected':
      return '/(tradie)/rewards/slips';
    case 'payment_release_decision':
      return '/(tradie)/earnings';
    default:
      return null;
  }
}
