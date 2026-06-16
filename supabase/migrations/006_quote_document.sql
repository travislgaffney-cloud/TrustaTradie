-- Add document URL column to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_document_url TEXT;

-- Create storage bucket for quote documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-documents', 'quote-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Tradies can upload quote documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quote-documents');

-- Allow anyone to read (customers need to view the tradie's quote doc)
CREATE POLICY "Quote documents are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quote-documents');

-- Allow tradies to delete their own uploads
CREATE POLICY "Tradies can delete their quote documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quote-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
