-- Make the documents bucket public so stored public URLs resolve correctly.
-- Files are already namespaced under {tradie_id}/{timestamp}_{filename}.
UPDATE storage.buckets SET public = true WHERE id = 'documents';

-- Allow public read access to document files (matches avatar/portfolio pattern)
CREATE POLICY "Documents are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');
