-- Photo of the finished work, added by the tradie once a job is complete.
-- Used as the base image for the "share to Instagram/Facebook" feature.
ALTER TABLE jobs ADD COLUMN completion_photo_url TEXT;

-- completion-photos was created private (authenticated-only read), but these
-- photos are meant to be shared publicly on social media and displayed
-- in-app via plain image URLs, so make the bucket public like job-images/portfolio.
UPDATE storage.buckets SET public = true WHERE id = 'completion-photos';

CREATE POLICY "Completion photos are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'completion-photos');
