import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { sendPushToUser } from './notifications';

export async function submitBugReport(params: {
  errorMessage: string;
  stackTrace?: string;
  screen?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const deviceInfo = {
    brand: Device.brand,
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    platform: Platform.OS,
    platformVersion: Platform.Version,
    isDevice: Device.isDevice,
  };

  const appVersion = Constants.expoConfig?.version ?? 'unknown';

  const { error } = await supabase.from('bug_reports').insert({
    user_id: user?.id ?? null,
    error_message: params.errorMessage,
    stack_trace: params.stackTrace ?? null,
    screen: params.screen ?? null,
    device_info: deviceInfo,
    app_version: appVersion,
  });

  if (error) {
    console.warn('[BugReport] Failed to submit:', error.message);
    return;
  }

  // Notify admin users
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (admins && admins.length > 0) {
    const title = 'Bug Report Received';
    const body = `${params.errorMessage.slice(0, 100)}${params.errorMessage.length > 100 ? '...' : ''}`;
    for (const admin of admins) {
      sendPushToUser(admin.id, title, body);
    }
  }
}
