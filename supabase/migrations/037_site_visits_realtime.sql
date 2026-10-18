-- site_visits was created in migration 022 but, unlike booking_proposals
-- (015), never added to the realtime publication — any postgres_changes
-- subscription on this table has always silently received nothing. This is
-- why a tradie suggesting a new date never live-updated the customer's
-- screen (or vice versa) without a manual refocus/refresh.
ALTER PUBLICATION supabase_realtime ADD TABLE site_visits;
ALTER TABLE site_visits REPLICA IDENTITY FULL;
