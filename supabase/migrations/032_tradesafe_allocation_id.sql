-- Needed to call TradeSafe's allocation-lifecycle mutations (complete/accept/
-- dispute delivery), which operate on the allocation id, not the transaction id.
ALTER TABLE transactions ADD COLUMN tradesafe_allocation_id TEXT;
