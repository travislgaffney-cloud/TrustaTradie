-- Create all storage buckets referenced in lib/storage.ts
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars',            'avatars',            true),
  ('job-images',         'job-images',         true),
  ('portfolio',          'portfolio',           true),
  ('documents',          'documents',           false),
  ('chat-attachments',   'chat-attachments',    false),
  ('completion-photos',  'completion-photos',   false)
ON CONFLICT (id) DO NOTHING;

-- ── avatars (public read, owner write) ──────────────────────────────────────
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

-- ── job-images (public read, customer write) ────────────────────────────────
CREATE POLICY "Job images are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'job-images');

CREATE POLICY "Customers can upload job images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-images');

-- ── portfolio (public read, tradie write) ───────────────────────────────────
CREATE POLICY "Portfolio images are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'portfolio');

CREATE POLICY "Tradies can upload portfolio images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tradies can delete their portfolio images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── documents (private, tradie read/write) ──────────────────────────────────
CREATE POLICY "Tradies can upload their documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tradies can read their own documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tradies can delete their own documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── chat-attachments (participants read, sender write) ──────────────────────
CREATE POLICY "Chat attachments readable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- ── completion-photos (authenticated read, tradie write) ────────────────────
CREATE POLICY "Completion photos readable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'completion-photos');

CREATE POLICY "Tradies can upload completion photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'completion-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
