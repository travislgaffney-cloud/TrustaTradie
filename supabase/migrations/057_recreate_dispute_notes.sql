-- dispute_notes (created by migration 002, and never dropped by any later
-- migration) was found live-missing from the database entirely during
-- testing of the dispute-resolution TradeSafe wiring — migration history
-- recorded 002 as applied, but information_schema.tables showed no such
-- table. Cause not identified (possibly schema drift from a past restore);
-- recreating it is the safe fix regardless, since nothing ever depended on
-- its prior contents. IF NOT EXISTS guards against a partial recreate.
CREATE TABLE IF NOT EXISTS dispute_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  admin_id     UUID NOT NULL REFERENCES profiles(id),
  note         TEXT NOT NULL,
  action_taken TEXT, -- 'note_only' | 'reverted_to_in_progress' | 'marked_completed' | 'marked_cancelled'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_notes_job_id ON dispute_notes(job_id);

ALTER TABLE dispute_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispute_notes_service_only" ON dispute_notes;
CREATE POLICY "dispute_notes_service_only" ON dispute_notes FOR ALL USING (auth.role() = 'service_role');
