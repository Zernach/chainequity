-- Create securities tables for tokenized equity management

-- Securities (Token Mint) table
CREATE TABLE IF NOT EXISTS securities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mint_address TEXT UNIQUE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  decimals INTEGER DEFAULT 9,
  total_supply BIGINT DEFAULT 0,
  current_supply BIGINT DEFAULT 0,
  program_id TEXT NOT NULL,
  metadata_address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_securities_mint_address ON securities(mint_address);
CREATE INDEX IF NOT EXISTS idx_securities_symbol ON securities(symbol);
CREATE INDEX IF NOT EXISTS idx_securities_is_active ON securities(is_active);

-- Allowlist table
CREATE TABLE IF NOT EXISTS allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID REFERENCES securities(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'rejected', 'revoked')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(security_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_allowlist_security_id ON allowlist(security_id);
CREATE INDEX IF NOT EXISTS idx_allowlist_wallet_address ON allowlist(wallet_address);
CREATE INDEX IF NOT EXISTS idx_allowlist_status ON allowlist(status);

-- Token balances table
CREATE TABLE IF NOT EXISTS token_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID REFERENCES securities(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  block_height BIGINT NOT NULL,
  slot BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(security_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_token_balances_security_id ON token_balances(security_id);
CREATE INDEX IF NOT EXISTS idx_token_balances_wallet_address ON token_balances(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_balances_block_height ON token_balances(block_height);

-- Corporate actions table
CREATE TABLE IF NOT EXISTS corporate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID REFERENCES securities(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('split', 'reverse_split', 'symbol_change', 'metadata_update')),
  old_mint_address TEXT,
  new_mint_address TEXT,
  old_symbol TEXT,
  new_symbol TEXT,
  split_ratio DECIMAL(10, 4),
  transaction_signature TEXT NOT NULL,
  block_height BIGINT NOT NULL,
  slot BIGINT NOT NULL,
  executed_by TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corporate_actions_security_id ON corporate_actions(security_id);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_action_type ON corporate_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_transaction_signature ON corporate_actions(transaction_signature);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID REFERENCES securities(id) ON DELETE CASCADE,
  transaction_signature TEXT UNIQUE NOT NULL,
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  amount BIGINT NOT NULL,
  block_height BIGINT NOT NULL,
  slot BIGINT NOT NULL,
  block_time TIMESTAMPTZ,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_security_id ON transfers(security_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_wallet ON transfers(from_wallet);
CREATE INDEX IF NOT EXISTS idx_transfers_to_wallet ON transfers(to_wallet);
CREATE INDEX IF NOT EXISTS idx_transfers_block_height ON transfers(block_height);
CREATE INDEX IF NOT EXISTS idx_transfers_transaction_signature ON transfers(transaction_signature);

-- Cap table snapshots table (for historical cap tables)
CREATE TABLE IF NOT EXISTS cap_table_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID REFERENCES securities(id) ON DELETE CASCADE,
  block_height BIGINT NOT NULL,
  slot BIGINT NOT NULL,
  total_supply BIGINT NOT NULL,
  holder_count INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL, -- Array of {wallet, balance, percentage}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(security_id, block_height)
);

CREATE INDEX IF NOT EXISTS idx_cap_table_snapshots_security_id ON cap_table_snapshots(security_id);
CREATE INDEX IF NOT EXISTS idx_cap_table_snapshots_block_height ON cap_table_snapshots(block_height);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_securities_updated_at
  BEFORE UPDATE ON securities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allowlist_updated_at
  BEFORE UPDATE ON allowlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_balances_updated_at
  BEFORE UPDATE ON token_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE securities ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_table_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for development)
-- In production, these should be more restrictive
CREATE POLICY "Allow all operations for authenticated users" ON securities
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON allowlist
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON token_balances
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON corporate_actions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON transfers
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON cap_table_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

