jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
}));
jest.mock('expo-device', () => ({}));

import { getNotificationRoute } from '@/lib/notifications';

// getNotificationRoute is the single source of truth for where a tap on a
// notification (in-app list or OS push) sends the user. Every blank-screen
// bug fixed this session traced back to a wrong or missing case here, so
// this pins every (type, role) combination the app actually sends.
describe('getNotificationRoute (lib/notifications.ts)', () => {
  describe('customer role', () => {
    it.each([
      ['new_quote_received', { job_id: 'j1' }, '/(customer)/jobs/j1/quotes?from=notifications'],
      ['site_visit_requested', { job_id: 'j1' }, '/(customer)/jobs/j1?from=notifications'],
      ['site_visit_completed', { job_id: 'j1' }, '/(customer)/jobs/j1?from=notifications'],
      ['quote_accepted', { job_id: 'j1' }, '/(customer)/jobs/j1?from=notifications'],
      ['quote_rejected', { job_id: 'j1' }, '/(customer)/jobs/j1?from=notifications'],
      ['job_started', { job_id: 'j1' }, '/(customer)/jobs/j1?from=notifications'],
      ['job_completed', { job_id: 'j1' }, '/(customer)/jobs/j1?from=notifications'],
      ['new_message', { conversation_id: 'c1' }, '/(customer)/messages/c1?from=notifications'],
      ['payment_released', { job_id: 'j1' }, '/(customer)/payments/j1?from=notifications'],
      ['payment_released', {}, '/(customer)/payments'],
      ['rating_received', { job_id: 'j1' }, '/rate/j1'],
    ] as const)('%s with %j routes to %s', (type, data, expected) => {
      expect(getNotificationRoute(type, data, 'customer')).toBe(expected);
    });

    it('returns null instead of a broken route when required data is missing', () => {
      expect(getNotificationRoute('new_quote_received', {}, 'customer')).toBeNull();
      expect(getNotificationRoute('site_visit_requested', null, 'customer')).toBeNull();
      expect(getNotificationRoute('site_visit_completed', null, 'customer')).toBeNull();
      expect(getNotificationRoute('new_message', {}, 'customer')).toBeNull();
      expect(getNotificationRoute('rating_received', {}, 'customer')).toBeNull();
    });
  });

  describe('tradie role', () => {
    it.each([
      ['quote_accepted', { job_id: 'j1' }, '/(tradie)/my-quotes'],
      ['quote_rejected', { job_id: 'j1' }, '/(tradie)/my-quotes'],
      ['new_quote_received', { job_id: 'j1' }, '/(tradie)/jobs/j1?from=notifications'],
      ['site_visit_requested', { job_id: 'j1' }, '/(tradie)/jobs/j1?from=notifications'],
      ['job_started', {}, '/(tradie)/my-quotes'],
      ['job_completed', {}, '/(tradie)/my-quotes'],
      ['payment_released', {}, '/(tradie)/earnings'],
      ['new_job_nearby', {}, '/(tradie)/jobs'],
      ['new_message', { conversation_id: 'c1' }, '/(tradie)/messages/c1?from=notifications'],
      ['rating_received', {}, '/(tradie)/profile'],
    ] as const)('%s with %j routes to %s', (type, data, expected) => {
      expect(getNotificationRoute(type, data, 'tradie')).toBe(expected);
    });

    it('returns null instead of a broken route when required data is missing', () => {
      expect(getNotificationRoute('quote_accepted', {}, 'tradie')).toBeNull();
      expect(getNotificationRoute('new_quote_received', {}, 'tradie')).toBeNull();
      expect(getNotificationRoute('new_message', {}, 'tradie')).toBeNull();
    });
  });

  it('falls back to null for a notification type with no route mapping', () => {
    expect(getNotificationRoute('something_unmapped' as any, {}, 'customer')).toBeNull();
    expect(getNotificationRoute('something_unmapped' as any, {}, 'tradie')).toBeNull();
  });
});
