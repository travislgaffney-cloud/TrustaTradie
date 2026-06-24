CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id     UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  job_id         UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tradie_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'generated',
  amount         NUMERIC(10,2) NOT NULL,
  vat_amount     NUMERIC(10,2),
  description    TEXT,
  uploaded_url   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id)
);

CREATE INDEX idx_invoices_tradie ON invoices(tradie_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_read" ON invoices FOR SELECT TO authenticated
  USING (tradie_id = auth.uid() OR customer_id = auth.uid());
CREATE POLICY "invoices_tradie_insert" ON invoices FOR INSERT TO authenticated
  WITH CHECK (tradie_id = auth.uid());
CREATE POLICY "invoices_service_all" ON invoices FOR ALL USING (auth.role() = 'service_role');

-- Add auto-release timestamp and hold flag to pending_payouts
ALTER TABLE pending_payouts ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ;
ALTER TABLE pending_payouts ADD COLUMN IF NOT EXISTS on_hold BOOLEAN DEFAULT FALSE;
ALTER TABLE pending_payouts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add invoice storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES
  ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Invoices are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices');
