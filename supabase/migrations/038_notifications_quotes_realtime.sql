-- Found while auditing for drift: hooks/use-notifications.ts and
-- hooks/use-quotes.ts both subscribe to postgres_changes on these tables,
-- but neither was ever added to the realtime publication in any prior
-- migration — unlike messages/conversations (013) and booking_proposals
-- (015). Not a case of someone editing the live DB by hand; the migration
-- to enable it was simply never written when these features were built.
-- Net effect: the in-app notification bell and a job's live quotes list
-- have never actually pushed updates — only ever refreshed on focus.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER TABLE notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
ALTER TABLE quotes REPLICA IDENTITY FULL;
