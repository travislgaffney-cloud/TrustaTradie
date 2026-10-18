-- Escrow partner switched from Truzo (never actually integrated) to TradeSafe.
-- Renames the placeholder column and adds what the real GraphQL integration
-- will need: TradeSafe issues a "token" per party (buyer/seller) which should
-- be created once and reused across transactions, plus a single platform-wide
-- token for Trust-a-Tradie's own AGENT party.
ALTER TABLE transactions RENAME COLUMN truzo_transaction_ref TO tradesafe_transaction_id;
ALTER TABLE transactions ADD COLUMN tradesafe_reference TEXT;

ALTER TABLE profiles ADD COLUMN tradesafe_token TEXT;

ALTER TABLE platform_settings ADD COLUMN tradesafe_agent_token TEXT;
