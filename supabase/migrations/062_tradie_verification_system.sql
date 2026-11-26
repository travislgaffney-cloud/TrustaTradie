-- Paid, automated tradie verification (ID + CIPC + bank account checks via
-- VerifyNow, payment via Ozow). One row per attempt, so a tradie can retry
-- or appeal without losing history. gold_verified (migration 053) is left
-- in place but no longer driven by any UI -- is_verified is now the single
-- "Verified" flag, set automatically when all three checks pass, or by an
-- admin approving an appeal.
CREATE TABLE tradie_verifications (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tradie_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  id_number             TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending_payment'
                          CHECK (status IN (
                            'pending_payment', 'paid', 'checking',
                            'passed', 'failed',
                            'appealed', 'appeal_approved', 'appeal_rejected'
                          )),

  -- Ozow payment tracking
  ozow_payment_id       TEXT,
  ozow_payment_status   TEXT,
  amount                NUMERIC(10,2) NOT NULL DEFAULT 100.00,

  -- VerifyNow check results (raw response + the pass/fail we derived from it)
  id_check_result       JSONB,
  id_check_passed       BOOLEAN,
  cipc_check_result     JSONB,
  cipc_check_passed     BOOLEAN,
  bank_check_result     JSONB,
  bank_check_passed     BOOLEAN,

  -- Appeal (only used when status moves to 'failed' -> 'appealed')
  appeal_note           TEXT,
  appeal_submitted_at   TIMESTAMPTZ,
  admin_decided_by      UUID REFERENCES profiles(id),
  admin_decided_at      TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tradie_verifications_tradie_id ON tradie_verifications(tradie_id);
CREATE INDEX idx_tradie_verifications_status ON tradie_verifications(status);

CREATE TRIGGER trg_tradie_verifications_updated_at
  BEFORE UPDATE ON tradie_verifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE tradie_verifications ENABLE ROW LEVEL SECURITY;

-- A tradie can see and create their own verification attempts, but cannot
-- directly edit status/check results/admin fields themselves -- those are
-- only ever written by edge functions using the service role, which
-- bypasses RLS entirely. The one thing a tradie CAN update directly is
-- their own appeal_note, handled by a narrower policy below.
CREATE POLICY "tradie_verifications_own_read" ON tradie_verifications
  FOR SELECT USING (auth.uid() = tradie_id);

CREATE POLICY "tradie_verifications_own_insert" ON tradie_verifications
  FOR INSERT WITH CHECK (auth.uid() = tradie_id);

CREATE POLICY "tradie_verifications_own_appeal" ON tradie_verifications
  FOR UPDATE USING (auth.uid() = tradie_id AND status = 'failed')
  WITH CHECK (auth.uid() = tradie_id AND status = 'appealed');

-- RLS alone only restricts which rows a tradie can touch and what the new
-- status can be -- it doesn't stop a crafted request from also flipping
-- e.g. id_check_passed in the same UPDATE. Belt-and-suspenders: reject any
-- direct (non-service-role) update that changes anything beyond the
-- status/appeal fields.
CREATE OR REPLACE FUNCTION guard_tradie_verification_appeal_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.id_number IS DISTINCT FROM OLD.id_number
     OR NEW.tradie_id IS DISTINCT FROM OLD.tradie_id
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.ozow_payment_id IS DISTINCT FROM OLD.ozow_payment_id
     OR NEW.ozow_payment_status IS DISTINCT FROM OLD.ozow_payment_status
     OR NEW.id_check_result IS DISTINCT FROM OLD.id_check_result
     OR NEW.id_check_passed IS DISTINCT FROM OLD.id_check_passed
     OR NEW.cipc_check_result IS DISTINCT FROM OLD.cipc_check_result
     OR NEW.cipc_check_passed IS DISTINCT FROM OLD.cipc_check_passed
     OR NEW.bank_check_result IS DISTINCT FROM OLD.bank_check_result
     OR NEW.bank_check_passed IS DISTINCT FROM OLD.bank_check_passed
     OR NEW.admin_decided_by IS DISTINCT FROM OLD.admin_decided_by
     OR NEW.admin_decided_at IS DISTINCT FROM OLD.admin_decided_at
  THEN
    RAISE EXCEPTION 'Only status and appeal fields can be changed directly';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guard_tradie_verification_appeal
  BEFORE UPDATE ON tradie_verifications
  FOR EACH ROW EXECUTE FUNCTION guard_tradie_verification_appeal_update();
