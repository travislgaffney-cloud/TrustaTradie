-- =============================================
-- TRANSACTION LEDGER (internal escrow tracking, dummy data — no real money moves yet)
-- Tracks: quoted -> accepted -> funds_held -> completed_by_provider ->
--         confirmed_by_customer -> released, with disputed/cancelled as side branches.
-- truzo_transaction_ref stays NULL until the real Truzo integration is wired in.
-- =============================================
CREATE TYPE transaction_status AS ENUM (
  'quoted',
  'accepted',
  'funds_held',
  'completed_by_provider',
  'confirmed_by_customer',
  'released',
  'disputed',
  'cancelled'
);

CREATE TABLE transactions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                UUID NOT NULL REFERENCES jobs(id),
  quote_id              UUID NOT NULL REFERENCES quotes(id),
  customer_id           UUID NOT NULL REFERENCES profiles(id),
  tradie_id             UUID NOT NULL REFERENCES profiles(id),
  quoted_amount         NUMERIC(10,2) NOT NULL,
  commission_pct        NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  status                transaction_status NOT NULL DEFAULT 'quoted',
  truzo_transaction_ref TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_job_id      ON transactions(job_id);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_tradie_id   ON transactions(tradie_id);

-- Append-only audit trail. Populated automatically by trigger below —
-- app code never needs to remember to log a status change.
CREATE TABLE transaction_status_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  status         transaction_status NOT NULL,
  changed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transaction_status_history_txn_id ON transaction_status_history(transaction_id);

CREATE OR REPLACE FUNCTION set_transaction_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_transaction_updated_at();

-- SECURITY DEFINER so the history row is written regardless of which party's
-- session triggered the status change (customer vs tradie RLS).
CREATE OR REPLACE FUNCTION log_transaction_status_change() RETURNS TRIGGER
  SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO transaction_status_history (transaction_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_log_status_change
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_transaction_status_change();

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_parties_read" ON transactions FOR SELECT USING (
  customer_id = auth.uid() OR tradie_id = auth.uid()
);
CREATE POLICY "transactions_customer_insert" ON transactions FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "transactions_parties_update" ON transactions FOR UPDATE USING (
  customer_id = auth.uid() OR tradie_id = auth.uid()
);
CREATE POLICY "transactions_service_role" ON transactions FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE transaction_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transaction_status_history_parties_read" ON transaction_status_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_status_history.transaction_id
    AND (t.customer_id = auth.uid() OR t.tradie_id = auth.uid())
  )
);
CREATE POLICY "transaction_status_history_service_role" ON transaction_status_history FOR ALL USING (auth.role() = 'service_role');
