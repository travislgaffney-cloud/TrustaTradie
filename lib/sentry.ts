import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Captures both JS exceptions and native (Android/iOS) crashes — this
    // is what the "Report a Bug" button was missing: a crash a user never
    // bothers reporting still reaches us automatically.
    tracesSampleRate: 0.2,
    enabled: !__DEV__,
  });
} else {
  console.warn('[sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash reporting disabled');
}

export { Sentry };
