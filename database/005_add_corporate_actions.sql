-- Add replaced_by and previous_mint to securities table for corporate actions tracking
ALTER TABLE securities 
ADD COLUMN IF NOT EXISTS replaced_by TEXT,
ADD COLUMN IF NOT EXISTS previous_mint TEXT;

-- Add comments for documentation
COMMENT ON COLUMN securities.replaced_by IS 'Mint address of the new token that replaced this one (for stock splits)';
COMMENT ON COLUMN securities.previous_mint IS 'Mint address of the previous token (if this is a result of a split)';

-- No foreign key constraint since we reference by mint_address (not primary key)
-- This is intentional to allow flexibility in corporate action tracking

