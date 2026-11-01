-- The tradie bank-details form collects an account holder name (needed to
-- confirm the EFT recipient matches before admin processes a payout) but no
-- column existed to save it, so it was silently discarded on submit.
ALTER TABLE profiles ADD COLUMN bank_account_holder TEXT;
