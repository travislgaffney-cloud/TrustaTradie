-- Single-row settings table so the commission take-rate (and future platform-wide
-- knobs) can be changed from the admin dashboard without a code deploy.
CREATE TABLE platform_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CONSTRAINT single_row CHECK (id),
  commission_pct NUMERIC(5, 4) NOT NULL DEFAULT 0.05,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (id, commission_pct) VALUES (TRUE, 0.05);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Every signed-in user needs to read it client-side to show fee breakdowns
-- before a quote is submitted/accepted. Writes go through the admin dashboard's
-- service-role API route only — no client-facing write policy.
CREATE POLICY "Authenticated users can read platform settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (true);
