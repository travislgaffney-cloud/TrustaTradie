import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryActive = Boolean(dsn);

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
  console.warn('[sentry] disabled (no DSN configured)');
}

export { Sentry };
