-- Admin Payment Release After 72 Hours. A tradie whose job has sat at
-- pending_completion for payment_release_hours (default 72, admin-
-- configurable, same pattern as commission_pct) with no customer
-- confirmation or dispute can ask admin to release the escrowed payment on
-- the customer's behalf.

-- jobs.completion_marked_at is set once, by completeJob() (hooks/use-jobs.ts),
-- the moment a job moves to pending_completion. The 72-hour clock reads
-- this, not updated_at, so an unrelated row update can never shift it.
ALTER TABLE jobs ADD COLUMN completion_marked_at TIMESTAMPTZ;

ALTER TABLE platform_settings ADD COLUMN payment_release_hours NUMERIC DEFAULT 72;

-- Set only on the admin release path, so a transaction's own row (not just
-- audit_log) makes an admin override visible at a glance.
ALTER TABLE transactions ADD COLUMN released_by_admin_id UUID REFERENCES profiles(id);
ALTER TABLE transactions ADD COLUMN released_by_admin_at TIMESTAMPTZ;

CREATE TYPE payment_release_status AS ENUM ('pending', 'released', 'declined');

CREATE TABLE payment_release_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id         UUID NOT NULL REFERENCES jobs(id),
  tradie_id      UUID NOT NULL REFERENCES profiles(id),
  requested_at   TIMESTAMPTZ DEFAULT NOW(),
  status         payment_release_status NOT NULL DEFAULT 'pending',
  reviewed_by    UUID REFERENCES profiles(id),
  reviewed_at    TIMESTAMPTZ,
  decision_note  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- "A tradie can't create a second pending request for a job that already
-- has one" as a DB-level guard, not just app logic — a partial unique index
-- so a new request is only blocked while one is actually still pending.
CREATE UNIQUE INDEX idx_payment_release_requests_one_pending_per_job
  ON payment_release_requests(job_id) WHERE status = 'pending';

ALTER TABLE payment_release_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_release_requests_tradie_read" ON payment_release_requests FOR SELECT USING (
  auth.uid() = tradie_id
);
CREATE POLICY "payment_release_requests_tradie_insert" ON payment_release_requests FOR INSERT WITH CHECK (
  auth.uid() = tradie_id AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND decision_note IS NULL
);
CREATE POLICY "payment_release_requests_admin_read" ON payment_release_requests FOR SELECT USING (
  is_admin()
);
CREATE POLICY "payment_release_requests_admin_update" ON payment_release_requests FOR UPDATE USING (
  is_admin()
);
CREATE POLICY "payment_release_requests_service_role" ON payment_release_requests FOR ALL USING (
  auth.role() = 'service_role'
);

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_release_requested';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_release_decision';
