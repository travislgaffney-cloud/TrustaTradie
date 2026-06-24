CREATE TABLE rating_images (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rating_id  UUID NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rating_images_rating ON rating_images(rating_id);

ALTER TABLE rating_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rating_images_public_read" ON rating_images FOR SELECT USING (true);
CREATE POLICY "rating_images_owner_insert" ON rating_images FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for review photos
INSERT INTO storage.buckets (id, name, public) VALUES
  ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Review photos are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'review-photos');

CREATE POLICY "Authenticated users can upload review photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'review-photos');
