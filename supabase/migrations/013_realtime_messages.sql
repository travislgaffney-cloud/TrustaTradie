-- Ensure messages and conversations are in the realtime publication
-- so postgres_changes events fire to subscribed clients
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
