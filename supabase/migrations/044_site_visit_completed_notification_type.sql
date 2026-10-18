-- Tradie marking a site visit as viewed/completed (markSiteVisitComplete) never
-- notified the customer. Reusing an existing type like 'job_started' would be
-- misleading (the job hasn't started), so add a dedicated type, same pattern
-- as 033_site_visit_notification_type.sql.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'site_visit_completed';
