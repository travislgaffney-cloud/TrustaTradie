-- Supabase Realtime UPDATE events only include changed columns by default.
-- REPLICA IDENTITY FULL ensures payload.new contains every column so the
-- client-side UPDATE handler can read is_read without a secondary fetch.
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
