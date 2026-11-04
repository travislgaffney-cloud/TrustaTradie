-- One-off backfill: populate TradeSafe sandbox bank details (the same
-- generic test account used for earlier test tradies) on any tradie that
-- hasn't set their own bank details yet, so payout testing isn't blocked by
-- missing data. Only fills in profiles where bank_name is still null — never
-- overwrites a tradie who has already entered real details.
UPDATE profiles
SET
  bank_name = 'fnb',
  bank_account_number = '0000000002',
  bank_branch_code = '250655',
  bank_account_type = 'cheque'
WHERE role = 'tradie' AND bank_name IS NULL;
