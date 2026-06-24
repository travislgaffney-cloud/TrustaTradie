-- Make chat-attachments public so React Native Image component can load them
-- without needing an Authorization header
UPDATE storage.buckets SET public = true WHERE id = 'chat-attachments';
