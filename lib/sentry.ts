import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Re-enabled as a diagnostic tool: the original TurboModule crash is gone
// (confirmed fixed by the SDK 54 New Architecture downgrade), but a new
// crash now happens via expo-updates' ErrorRecovery.crash() path
// (expo.controller.errorRecoveryQueue), which re-throws whatever error
// originally triggered it. That original error never reaches our JS-level
// ErrorUtils handler (ruling out a plain JS throw), so Sentry's native
// crash handler - which captures SIGABRT/NSException crashes independently
// of JS - is the fastest way to see the real exception name/reason.
const SENTRY_TEMPORARILY_DISABLED = false;

export const sentryActive = Boolean(dsn) && !SENTRY_TEMPORARILY_DISABLED;

if (sentryActive) {
  try {
    Sentry.init({
      dsn,
      enabled: !__DEV__,
    });
  } catch (err) {
    console.warn('[sentry] init failed, continuing without crash reporting:', err);
  }
} else {
  console.warn('[sentry] disabled (either no DSN or temporarily disabled for diagnosis)');
}

export { Sentry };
