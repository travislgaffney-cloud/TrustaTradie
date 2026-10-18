-- Supplier Rewards Program, Phase 1: suppliers, tradie account linking +
-- consent, and slip upload. No approval logic yet — every slip lands at
-- 'pending' until Phase 2 adds the auto-approval rules and review queue.
-- See the "Supplier Rewards Program" plan doc for the full design.

CREATE TYPE reward_slip_status AS ENUM ('pending', 'approved', 'rejected');

-- =============================================
-- SUPPLIERS (admin-managed catalogue)
-- =============================================
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  logo_url        TEXT,
  report_emails   TEXT[] NOT NULL DEFAULT '{}',
  reward_pct      NUMERIC(5,4) NOT NULL DEFAULT 0,
  commission_pct  NUMERIC(5,4) NOT NULL DEFAULT 0,
  min_slip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  active_from     TIMESTAMPTZ,
  active_to       TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_suppliers_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suppliers_set_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_suppliers_updated_at();

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Every tradie needs to read the active supplier list to link an account or
-- submit a slip; nothing here is sensitive (no account numbers, no spend).
CREATE POLICY "suppliers_authenticated_read" ON suppliers FOR SELECT USING (true);
CREATE POLICY "suppliers_service_role" ON suppliers FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- TRADIE <-> SUPPLIER ACCOUNT LINKS (+ POPIA consent)
-- =============================================
CREATE TABLE tradie_supplier_accounts (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tradie_id          UUID NOT NULL REFERENCES profiles(id),
  supplier_id        UUID NOT NULL REFERENCES suppliers(id),
  account_number     TEXT NOT NULL,
  consent_given_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_version    TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tradie_id, supplier_id)
);

CREATE TRIGGER tradie_supplier_accounts_set_updated_at
  BEFORE UPDATE ON tradie_supplier_accounts
  FOR EACH ROW EXECUTE FUNCTION set_suppliers_updated_at();

CREATE INDEX idx_tradie_supplier_accounts_tradie_id ON tradie_supplier_accounts(tradie_id);

ALTER TABLE tradie_supplier_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tradie_supplier_accounts_owner_read" ON tradie_supplier_accounts FOR SELECT USING (
  auth.uid() = tradie_id
);
CREATE POLICY "tradie_supplier_accounts_owner_write" ON tradie_supplier_accounts FOR INSERT WITH CHECK (
  auth.uid() = tradie_id
);
CREATE POLICY "tradie_supplier_accounts_owner_update" ON tradie_supplier_accounts FOR UPDATE USING (
  auth.uid() = tradie_id
);
CREATE POLICY "tradie_supplier_accounts_admin_read" ON tradie_supplier_accounts FOR SELECT USING (
  is_admin()
);
CREATE POLICY "tradie_supplier_accounts_service_role" ON tradie_supplier_accounts FOR ALL USING (
  auth.role() = 'service_role'
);

-- =============================================
-- REWARD SLIPS
-- =============================================
CREATE TABLE reward_slips (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tradie_id         UUID NOT NULL REFERENCES profiles(id),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),
  image_path        TEXT NOT NULL,
  image_hash        TEXT,
  slip_number       TEXT NOT NULL,
  slip_date         DATE NOT NULL,
  total_amount      NUMERIC(10,2) NOT NULL,
  ocr_supplier_name TEXT,
  ocr_total         NUMERIC(10,2),
  ocr_date          DATE,
  ocr_confidence    NUMERIC(5,4),
  status            reward_slip_status NOT NULL DEFAULT 'pending',
  flagged_reason    TEXT,
  reward_pct_locked NUMERIC(5,4),
  reward_amount     NUMERIC(10,2),
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES profiles(id),
  rejected_reason   TEXT,
  report_line_id    UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER reward_slips_set_updated_at
  BEFORE UPDATE ON reward_slips
  FOR EACH ROW EXECUTE FUNCTION set_suppliers_updated_at();

CREATE INDEX idx_reward_slips_tradie_id ON reward_slips(tradie_id);
CREATE INDEX idx_reward_slips_supplier_id ON reward_slips(supplier_id);
CREATE INDEX idx_reward_slips_status ON reward_slips(status);
-- Backs the exact-duplicate check (same supplier + slip number) added in Phase 2.
CREATE UNIQUE INDEX idx_reward_slips_supplier_slip_number ON reward_slips(supplier_id, slip_number);

ALTER TABLE reward_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward_slips_owner_read" ON reward_slips FOR SELECT USING (
  auth.uid() = tradie_id
);
CREATE POLICY "reward_slips_owner_insert" ON reward_slips FOR INSERT WITH CHECK (
  auth.uid() = tradie_id
);
CREATE POLICY "reward_slips_admin_read" ON reward_slips FOR SELECT USING (
  is_admin()
);
CREATE POLICY "reward_slips_service_role" ON reward_slips FOR ALL USING (
  auth.role() = 'service_role'
);

-- Append-only approval history, same pattern as transaction_status_history
-- (026) — a trigger logs every status change so app code never has to
-- remember to.
CREATE TABLE reward_slip_status_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slip_id        UUID NOT NULL REFERENCES reward_slips(id) ON DELETE CASCADE,
  status         reward_slip_status NOT NULL,
  changed_by     UUID REFERENCES profiles(id),
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reward_slip_status_history_slip_id ON reward_slip_status_history(slip_id);

CREATE OR REPLACE FUNCTION log_reward_slip_status_change() RETURNS TRIGGER
  SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO reward_slip_status_history (slip_id, status, changed_by)
    VALUES (NEW.id, NEW.status, COALESCE(NEW.approved_by, auth.uid()));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reward_slips_log_status_change
  AFTER INSERT OR UPDATE ON reward_slips
  FOR EACH ROW EXECUTE FUNCTION log_reward_slip_status_change();

ALTER TABLE reward_slip_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward_slip_status_history_owner_read" ON reward_slip_status_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM reward_slips s
    WHERE s.id = reward_slip_status_history.slip_id AND s.tradie_id = auth.uid()
  )
);
CREATE POLICY "reward_slip_status_history_admin_read" ON reward_slip_status_history FOR SELECT USING (
  is_admin()
);
CREATE POLICY "reward_slip_status_history_service_role" ON reward_slip_status_history FOR ALL USING (
  auth.role() = 'service_role'
);

-- =============================================
-- PRIVATE STORAGE: reward-slips
-- =============================================
-- Unlike every other bucket in this app (all ended up public-read, several
-- after starting private — see the plan doc), this one stays genuinely
-- private: till slips are financial documents tied to a real person's
-- spend. Only the owning tradie and admins can read them, and only ever via
-- a short-lived signed URL generated server-side — never getPublicUrl().
INSERT INTO storage.buckets (id, name, public)
VALUES ('reward-slips', 'reward-slips', false);

-- Path convention: <tradie_id>/<slip filename> — mirrors the ownership-prefix
-- pattern already used for the documents/portfolio buckets (migration 011).
CREATE POLICY "Tradies can read their own reward slips"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'reward-slips' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tradies can upload their own reward slips"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reward-slips' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can read all reward slips"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'reward-slips' AND is_admin());

CREATE POLICY "Service role has full access to reward slips"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'reward-slips');
