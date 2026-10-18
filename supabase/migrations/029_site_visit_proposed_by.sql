-- Tracks whose turn it is to respond to a 'proposed' site visit. Without this,
-- a customer counter-proposing a new time also lands on status 'proposed',
-- indistinguishable from the tradie's original proposal, so the customer's own
-- screen kept treating it as still awaiting the customer instead of the tradie.
ALTER TABLE site_visits ADD COLUMN proposed_by TEXT NOT NULL DEFAULT 'tradie'
  CHECK (proposed_by IN ('tradie', 'customer'));
