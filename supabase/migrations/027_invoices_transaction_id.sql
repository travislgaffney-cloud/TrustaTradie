-- Invoices used to be keyed exclusively off `payments`, which the new transaction
-- ledger flow no longer creates. Add transaction_id as an alternative anchor so
-- invoices work for jobs paid via the transactions ledger, while leaving payment_id
-- intact (nullable) for any pre-existing PayFast-era invoices.
ALTER TABLE invoices ALTER COLUMN payment_id DROP NOT NULL;
ALTER TABLE invoices ADD COLUMN transaction_id UUID REFERENCES transactions(id);
ALTER TABLE invoices ADD CONSTRAINT invoices_transaction_id_unique UNIQUE (transaction_id);
ALTER TABLE invoices ADD CONSTRAINT invoices_payment_or_transaction_chk
  CHECK (payment_id IS NOT NULL OR transaction_id IS NOT NULL);

CREATE INDEX idx_invoices_transaction_id ON invoices(transaction_id);
