import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Wrapped defensively on purpose: this runs at module-eval time, before
// anything else in the app, so a problem in Sentry's own native init must
// never be able to take the whole app down with it. Diagnosing a real
// iOS TestFlight launch crash (RCTExceptionsManager reportFatal, see
// crash log 15485714-9C00-4E94-A8F3-1FB926197B10) that started with this
// build — tracesSampleRate/performance tracing removed too, to shrink
// the native surface area while narrowing down the cause.
if (dsn) {
  try {
    Sentry.init({
      dsn,
      enabled: !__DEV__,
    });
  } catch (err) {
    console.warn('[sentry] init failed, continuing without crash reporting:', err);
  }
} else {
  console.warn('[sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash reporting disabled');
}

export { Sentry };
