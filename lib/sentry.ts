import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// TEMPORARY: fully disabled to isolate a real TestFlight launch crash
// (RCTExceptionsManager reportFatal on the TurboModule queue, crash
// 15485714-9C00-4E94-A8F3-1FB926197B10) that started appearing in the same
// build this was added. The React Native-level "disable New Architecture"
// workaround for the known upstream iOS 26 TurboModule bug turned out to be
// unavailable on this RN version (silently ignored), so this skips Sentry's
// native init entirely for one build to test whether it's the actual
// trigger — Sentry's native setup does work asynchronously on a background
// queue, which the try/catch below can't protect against. Remove this
// early return once the real cause is confirmed one way or the other.
const SENTRY_TEMPORARILY_DISABLED = true;

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
