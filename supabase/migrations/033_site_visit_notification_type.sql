-- Site-visit request/reschedule notifications were reusing 'new_quote_received',
-- which for the customer role routes to the job's quotes list — empty for a
-- visit request (no quote exists yet), so tapping the notification landed on
-- what looked like a blank screen. A dedicated type lets routing send the
-- customer to the job detail screen instead, where the visit request lives.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'site_visit_requested';
