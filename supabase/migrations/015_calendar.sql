-- Safe to re-run: idempotent column add
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Drop and recreate table cleanly
DROP TABLE IF EXISTS booking_proposals CASCADE;

CREATE TABLE booking_proposals (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  job_id            UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  proposed_by       UUID        NOT NULL REFERENCES profiles(id),
  proposed_datetime TIMESTAMPTZ NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE booking_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_proposals_select" ON booking_proposals;
CREATE POLICY "booking_proposals_select" ON booking_proposals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = booking_proposals.conversation_id
        AND (c.customer_id = auth.uid() OR c.tradie_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "booking_proposals_insert" ON booking_proposals;
CREATE POLICY "booking_proposals_insert" ON booking_proposals
  FOR INSERT WITH CHECK (
    proposed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = booking_proposals.conversation_id
        AND (c.customer_id = auth.uid() OR c.tradie_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "booking_proposals_update" ON booking_proposals;
CREATE POLICY "booking_proposals_update" ON booking_proposals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = booking_proposals.conversation_id
        AND (c.customer_id = auth.uid() OR c.tradie_id = auth.uid())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE booking_proposals;
ALTER TABLE booking_proposals REPLICA IDENTITY FULL;
