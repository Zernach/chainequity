-- Migration: Wallet-Only Authentication
-- This migration documents the transition to wallet-only authentication
-- Email/password authentication is deprecated as of this migration
-- Update comments to clarify email is optional and wallet is primary auth method
COMMENT ON COLUMN users.email IS 'User email address (OPTIONAL - wallet-only auth is primary method)';
COMMENT ON COLUMN users.wallet_address IS 'Solana wallet address (PRIMARY authentication method)';
COMMENT ON COLUMN users.email_verified IS 'Whether email has been verified (deprecated)';
COMMENT ON COLUMN users.wallet_verified IS 'Whether wallet ownership has been verified via signature (REQUIRED for authentication)';

-- Ensure email can be null (should already be nullable from migration 004)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add constraint to ensure either wallet_address exists
-- Since wallet is now the only auth method, we should have wallet_address
-- But we'll make this flexible for existing data
-- Future records should always have wallet_address

-- Create index on wallet_verified for faster auth queries
CREATE INDEX IF NOT EXISTS idx_users_wallet_verified ON users(wallet_verified) WHERE wallet_verified = true;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 006: Wallet-only authentication configuration completed';
  RAISE NOTICE 'Email/password authentication is now deprecated';
  RAISE NOTICE 'All new users must authenticate via Solana wallet';
END $$;

