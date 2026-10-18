-- Phase 3 of the Supplier Rewards plan: monthly reporting. supplier_reports
-- is the idempotency guard itself (UNIQUE(supplier_id, period_start), not
-- "whether the cron happened to fire") and supplier_report_lines is the
-- per-tradie breakdown, frozen at generation time. reward_slips.report_line_id
-- already exists (migration 045) but had no FK target until now; once a
-- slip is claimed by a line it can never be claimed by another — that, plus
-- the UNIQUE constraint below, is the whole re-run safety story.
CREATE TABLE supplier_reports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id      UUID NOT NULL REFERENCES suppliers(id),
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  generated_at     TIMESTAMPTZ DEFAULT NOW(),
  sent_at          TIMESTAMPTZ,
  access_token     TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (supplier_id, period_start)
);

CREATE TABLE supplier_report_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id       UUID NOT NULL REFERENCES supplier_reports(id) ON DELETE CASCADE,
  tradie_id       UUID NOT NULL REFERENCES profiles(id),
  account_number  TEXT NOT NULL,
  slip_count      INTEGER NOT NULL,
  total_spend     NUMERIC(10,2) NOT NULL,
  reward_pct      NUMERIC(5,4) NOT NULL,
  credit_to_load  NUMERIC(10,2) NOT NULL,
  commission_due  NUMERIC(10,2) NOT NULL,
  loaded_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reward_slips
  ADD CONSTRAINT reward_slips_report_line_id_fkey
  FOREIGN KEY (report_line_id) REFERENCES supplier_report_lines(id);

ALTER TABLE supplier_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_report_lines ENABLE ROW LEVEL SECURITY;

-- No policies on either table, on purpose — same stance as audit_log. The
-- three ways these rows are ever touched are: the monthly-report-generate
-- edge function (service role), the admin dashboard (service-role client,
-- same as every other admin/src/lib/supabase.ts route), and the public
-- supplier confirmation link (validated by access_token in application
-- code, not by Postgres role — it also goes through the service-role
-- client). None of those are the `authenticated` or `anon` Postgres roles
-- RLS would otherwise need to grant to.
