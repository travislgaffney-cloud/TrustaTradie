import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { sendPushToUser } from './notifications';
import { Sentry } from './sentry';

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

  // The ErrorBoundary crash path already calls Sentry.captureException
  // itself (componentDidCatch) — only the manual "Report a Bug" button
  // (no prior crash) needs reporting here, so the same event isn't logged
  // to Sentry twice.
  if (params.screen !== 'ErrorBoundary (crash)') {
    Sentry.captureMessage(params.errorMessage, {
      level: 'info',
      tags: { source: 'manual_bug_report', screen: params.screen ?? 'unknown' },
      extra: { stackTrace: params.stackTrace, deviceInfo, appVersion },
    });
  }

  // Notify admin users — admin accounts are tagged via the separate
  // `admins` table, not profiles.role (which stays customer/tradie), and
  // that table is admin-read-only under RLS, so this goes through the
  // admin_user_ids() RPC rather than selecting from either directly.
  const { data: adminIds } = await supabase.rpc('admin_user_ids');

  if (adminIds && adminIds.length > 0) {
    const title = 'Bug Report Received';
    const body = `${params.errorMessage.slice(0, 100)}${params.errorMessage.length > 100 ? '...' : ''}`;
    for (const id of adminIds) {
      sendPushToUser(id, title, body);
    }
  }
}
