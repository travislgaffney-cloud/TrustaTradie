import type { ImageSourcePropType } from 'react-native';

// Alert types that have a custom icon image instead of an emoji. Any type
// not listed here still falls back to the emoji in TYPE_ICONS (or the
// generic 🔔) until it gets its own custom icon.
export const NOTIFICATION_ICON_SOURCES: Partial<Record<string, ImageSourcePropType>> = {
  quote_accepted: require('@/assets/images/notifications/completed-tick.png'),
  job_completed: require('@/assets/images/notifications/completed-tick.png'),
  job_started: require('@/assets/images/notifications/completed-tick.png'),
  site_visit_completed: require('@/assets/images/notifications/completed-tick.png'),
  reward_slip_approved: require('@/assets/images/notifications/completed-tick.png'),
};
