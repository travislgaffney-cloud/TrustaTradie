import type { ImageSourcePropType } from 'react-native';

// Alert types that have a custom icon image instead of an emoji. Any type
// not listed here still falls back to the emoji in TYPE_ICONS (or the
// generic 🔔) until it gets its own custom icon.
export const NOTIFICATION_ICON_SOURCES: Partial<Record<string, ImageSourcePropType>> = {
  quote_accepted: require('@/assets/images/notifications/completed-tick.png'),
  job_completed: require('@/assets/images/notifications/completed-tick.png'),
  site_visit_completed: require('@/assets/images/notifications/completed-tick.png'),
  reward_slip_approved: require('@/assets/images/notifications/completed-tick.png'),

  // calendar.png: any alert with a date/scheduling dimension attached to it.
  // Checked every other uncovered type's `data` payload (job_id/quote_id/
  // slip_id/conversation_id only, no dates) -- none currently qualify, but
  // a future type carrying a scheduled date should use this icon too.
  job_started: require('@/assets/images/notifications/calendar.png'),
  site_visit_requested: require('@/assets/images/notifications/calendar.png'),

  new_quote_received: require('@/assets/images/notifications/hard-hat.png'),

  new_job_nearby: require('@/assets/images/notifications/location-pin.png'),
  new_message: require('@/assets/images/notifications/new-message.png'),
};
