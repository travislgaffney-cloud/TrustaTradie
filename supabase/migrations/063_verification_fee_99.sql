-- Price change: R100 -> R99. The ozow-checkout edge function always sets
-- `amount` explicitly on insert, so this default is never actually relied
-- on at runtime -- updating it anyway for consistency.
ALTER TABLE tradie_verifications ALTER COLUMN amount SET DEFAULT 99.00;
