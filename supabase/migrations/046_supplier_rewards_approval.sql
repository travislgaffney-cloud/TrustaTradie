-- Supplier Rewards Program, Phase 2: auto-approval rules + admin review
-- queue. See the plan doc's "Approval Rules & Auto-Approval Logic" and
-- "Admin Backend" sections.

ALTER TABLE platform_settings
  ADD COLUMN reward_auto_approve_threshold NUMERIC(10,2) NOT NULL DEFAULT 5000,
  ADD COLUMN reward_slip_max_age_days INTEGER NOT NULL DEFAULT 60;

-- Phase 1 let a tradie insert a reward_slips row with ANY status, trusting
-- the client — fine when every slip just landed at 'pending' regardless.
-- Phase 2 computes real money (reward_amount) and can auto-approve, so a
-- client that could insert status='approved' directly could self-approve
-- an arbitrary reward. Replace the Phase 1 policy with one that only ever
-- allows a tradie to insert a fresh, unevaluated slip — every other field
-- (status, reward_pct_locked, reward_amount, approved_at/by,
-- rejected_reason) only ever changes via the service-role evaluation
-- function or an admin's own service-role mutation, never directly by the
-- tradie.
DROP POLICY "reward_slips_owner_insert" ON reward_slips;

CREATE POLICY "reward_slips_owner_insert" ON reward_slips FOR INSERT WITH CHECK (
  auth.uid() = tradie_id
  AND status = 'pending'
  AND reward_pct_locked IS NULL
  AND reward_amount IS NULL
  AND approved_at IS NULL
  AND approved_by IS NULL
  AND rejected_reason IS NULL
);
