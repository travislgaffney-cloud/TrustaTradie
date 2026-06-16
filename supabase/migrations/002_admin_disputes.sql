-- =============================================
-- DISPUTE NOTES (admin dashboard audit trail)
-- =============================================
CREATE TABLE dispute_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  admin_id     UUID NOT NULL REFERENCES profiles(id),
  note         TEXT NOT NULL,
  action_taken TEXT, -- 'note_only' | 'reverted_to_in_progress' | 'marked_completed' | 'marked_cancelled'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dispute_notes_job_id ON dispute_notes(job_id);

ALTER TABLE dispute_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dispute_notes_service_only" ON dispute_notes FOR ALL USING (auth.role() = 'service_role');
