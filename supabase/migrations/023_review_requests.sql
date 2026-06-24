CREATE TABLE review_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tradie_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 1,
  last_sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, tradie_id)
);

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_requests_tradie_insert" ON review_requests FOR INSERT TO authenticated
  WITH CHECK (tradie_id = auth.uid());
CREATE POLICY "review_requests_read" ON review_requests FOR SELECT TO authenticated
  USING (tradie_id = auth.uid() OR customer_id = auth.uid());
CREATE POLICY "review_requests_tradie_update" ON review_requests FOR UPDATE TO authenticated
  USING (tradie_id = auth.uid());
