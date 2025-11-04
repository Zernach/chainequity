-- Helper functions for cap table operations

-- Function to update token balance (increment or decrement)
CREATE OR REPLACE FUNCTION update_balance(
  p_security_id UUID,
  p_wallet TEXT,
  p_amount BIGINT,
  p_block_height BIGINT,
  p_slot BIGINT
) RETURNS void AS $$
BEGIN
  INSERT INTO token_balances (security_id, wallet_address, balance, block_height, slot)
  VALUES (p_security_id, p_wallet, p_amount, p_block_height, p_slot)
  ON CONFLICT (security_id, wallet_address)
  DO UPDATE SET
    balance = token_balances.balance + p_amount,
    block_height = GREATEST(token_balances.block_height, p_block_height),
    slot = GREATEST(token_balances.slot, p_slot),
    updated_at = NOW()
  WHERE token_balances.security_id = p_security_id
    AND token_balances.wallet_address = p_wallet;
END;
$$ LANGUAGE plpgsql;

-- Function to get cap table at a specific block height
CREATE OR REPLACE FUNCTION get_cap_table_at_block(
  p_mint_address TEXT,
  p_block_height BIGINT
) RETURNS TABLE (
  wallet_address TEXT,
  balance BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  v_security_id UUID;
  v_total_supply BIGINT;
BEGIN
  -- Get security ID and total supply
  SELECT id, current_supply INTO v_security_id, v_total_supply
  FROM securities
  WHERE mint_address = p_mint_address;

  IF v_security_id IS NULL THEN
    RAISE EXCEPTION 'Security not found: %', p_mint_address;
  END IF;

  -- Return balances at or before the specified block height
  RETURN QUERY
  SELECT
    tb.wallet_address,
    tb.balance,
    CASE
      WHEN v_total_supply > 0 THEN (tb.balance::NUMERIC / v_total_supply::NUMERIC * 100)
      ELSE 0
    END as percentage
  FROM token_balances tb
  WHERE tb.security_id = v_security_id
    AND tb.block_height <= p_block_height
    AND tb.balance > 0
  ORDER BY tb.balance DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate ownership concentration metrics
CREATE OR REPLACE FUNCTION calculate_concentration_metrics(
  p_mint_address TEXT
) RETURNS TABLE (
  total_holders INTEGER,
  top_1_percentage NUMERIC,
  top_5_percentage NUMERIC,
  top_10_percentage NUMERIC
) AS $$
DECLARE
  v_security_id UUID;
  v_total_supply BIGINT;
BEGIN
  -- Get security ID and total supply
  SELECT id, current_supply INTO v_security_id, v_total_supply
  FROM securities
  WHERE mint_address = p_mint_address;

  IF v_security_id IS NULL THEN
    RAISE EXCEPTION 'Security not found: %', p_mint_address;
  END IF;

  IF v_total_supply = 0 THEN
    RETURN QUERY SELECT 0, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked_holders AS (
    SELECT
      wallet_address,
      balance,
      (balance::NUMERIC / v_total_supply::NUMERIC * 100) as percentage,
      ROW_NUMBER() OVER (ORDER BY balance DESC) as rank
    FROM token_balances
    WHERE security_id = v_security_id
      AND balance > 0
  )
  SELECT
    COUNT(*)::INTEGER as total_holders,
    COALESCE(SUM(percentage) FILTER (WHERE rank <= 1), 0) as top_1_percentage,
    COALESCE(SUM(percentage) FILTER (WHERE rank <= 5), 0) as top_5_percentage,
    COALESCE(SUM(percentage) FILTER (WHERE rank <= 10), 0) as top_10_percentage
  FROM ranked_holders;
END;
$$ LANGUAGE plpgsql;

-- Function to get transfer volume in a time period
CREATE OR REPLACE FUNCTION get_transfer_volume(
  p_mint_address TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS TABLE (
  transfer_count BIGINT,
  total_volume BIGINT,
  unique_senders INTEGER,
  unique_recipients INTEGER
) AS $$
DECLARE
  v_security_id UUID;
BEGIN
  -- Get security ID
  SELECT id INTO v_security_id
  FROM securities
  WHERE mint_address = p_mint_address;

  IF v_security_id IS NULL THEN
    RAISE EXCEPTION 'Security not found: %', p_mint_address;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as transfer_count,
    COALESCE(SUM(amount), 0)::BIGINT as total_volume,
    COUNT(DISTINCT from_wallet)::INTEGER as unique_senders,
    COUNT(DISTINCT to_wallet)::INTEGER as unique_recipients
  FROM transfers
  WHERE security_id = v_security_id
    AND block_time >= p_start_time
    AND block_time <= p_end_time
    AND status = 'confirmed';
END;
$$ LANGUAGE plpgsql;

-- Function to check if wallet is on allowlist
CREATE OR REPLACE FUNCTION is_wallet_approved(
  p_mint_address TEXT,
  p_wallet_address TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_security_id UUID;
  v_status TEXT;
BEGIN
  -- Get security ID
  SELECT id INTO v_security_id
  FROM securities
  WHERE mint_address = p_mint_address;

  IF v_security_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check allowlist status
  SELECT status INTO v_status
  FROM allowlist
  WHERE security_id = v_security_id
    AND wallet_address = p_wallet_address;

  RETURN v_status = 'approved';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance on helper functions
CREATE INDEX IF NOT EXISTS idx_token_balances_security_wallet ON token_balances(security_id, wallet_address);
CREATE INDEX IF NOT EXISTS idx_transfers_security_time ON transfers(security_id, block_time);
CREATE INDEX IF NOT EXISTS idx_allowlist_security_wallet ON allowlist(security_id, wallet_address);

-- Add comments to functions
COMMENT ON FUNCTION update_balance IS 'Updates token balance for a wallet (increments or decrements)';
COMMENT ON FUNCTION get_cap_table_at_block IS 'Returns cap table snapshot at a specific block height';
COMMENT ON FUNCTION calculate_concentration_metrics IS 'Calculates ownership concentration (top holders %)';
COMMENT ON FUNCTION get_transfer_volume IS 'Returns transfer metrics for a time period';
COMMENT ON FUNCTION is_wallet_approved IS 'Checks if a wallet is approved on the allowlist';

