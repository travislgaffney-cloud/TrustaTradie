-- Add missing trade categories that exist in the frontend
ALTER TYPE trade_category ADD VALUE IF NOT EXISTS 'flooring';
ALTER TYPE trade_category ADD VALUE IF NOT EXISTS 'carpentry';

-- Add suburb and province columns to profiles (needed by get_nearby_tradies RPC)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suburb TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS province TEXT;
