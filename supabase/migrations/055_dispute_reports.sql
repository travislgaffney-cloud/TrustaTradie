-- Raising a dispute previously captured nothing beyond a confirmation
-- alert — admin had to message the customer separately just to find out
-- what happened. dispute_reports is the customer's own account of the
-- issue, kept separate from dispute_notes (admin's record of what THEY
-- did about it) so a job disputed more than once over its lifetime keeps
-- each original complaint intact rather than overwriting it.
CREATE TABLE dispute_reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES jobs(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  reason      TEXT NOT NULL,
  photo_paths TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dispute_reports_job_id ON dispute_reports(job_id);

ALTER TABLE dispute_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_reports_customer_insert" ON dispute_reports FOR INSERT WITH CHECK (
  customer_id = auth.uid()
);
CREATE POLICY "dispute_reports_customer_read" ON dispute_reports FOR SELECT USING (
  customer_id = auth.uid()
);
-- The tradie on the job can see what they're accused of too — admin
-- would just relay it anyway, and mediating fairly needs both sides
-- actually informed.
CREATE POLICY "dispute_reports_tradie_read" ON dispute_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM transactions WHERE transactions.job_id = dispute_reports.job_id AND transactions.tradie_id = auth.uid())
);
CREATE POLICY "dispute_reports_admin_read" ON dispute_reports FOR SELECT USING (
  is_admin()
);

-- Private from the start this time (see migration 053/054's documents
-- bucket cleanup) — evidence photos can show property, faces, or other
-- personal detail with no reason to ever be public.
INSERT INTO storage.buckets (id, name, public) VALUES ('dispute-evidence', 'dispute-evidence', false);

CREATE POLICY "dispute_evidence_customer_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'dispute-evidence' AND
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id::text = (storage.foldername(name))[1] AND jobs.customer_id = auth.uid())
);
CREATE POLICY "dispute_evidence_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'dispute-evidence' AND (
    is_admin()
    OR EXISTS (SELECT 1 FROM jobs WHERE jobs.id::text = (storage.foldername(name))[1] AND jobs.customer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM transactions WHERE transactions.job_id::text = (storage.foldername(name))[1] AND transactions.tradie_id = auth.uid())
  )
);
