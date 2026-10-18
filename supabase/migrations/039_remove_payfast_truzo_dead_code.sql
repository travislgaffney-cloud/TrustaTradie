-- Removes the dead PayFast/legacy-payments flow (superseded by the
-- transactions + TradeSafe ledger, see 026/031). Truzo never got further
-- than an unused API key and a column that was already renamed to
-- tradesafe_transaction_id in migration 031 — nothing left to drop there.
--
-- Verified before writing this: `payments` has 0 rows, `pending_payouts` has
-- 0 rows, and no `invoices.payment_id` is ever set — so this is a pure
-- schema cleanup, not a data-loss risk.
--
-- pending_payouts.payment_id referenced payments(id) but was never read by
-- any live code (admin's payouts dashboard/API never selects it) and was
-- only ever written by the now-deleted release-payment edge function —
-- dropped here so payments can be dropped cleanly without orphaning it.
ALTER TABLE pending_payouts DROP COLUMN IF EXISTS payment_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS payment_id;

DROP TABLE IF EXISTS payments;
