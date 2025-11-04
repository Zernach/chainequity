-- Add authentication and role-based access columns to users table
-- This migration integrates with Supabase Auth and adds role management

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'investor' 
  CHECK (role IN ('admin', 'issuer', 'investor', 'viewer'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN DEFAULT false;

-- Create unique indexes for auth_user_id and email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Update the users table trigger (already exists, just ensuring it's active)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop existing overly permissive RLS policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON users;

-- Create new role-based RLS policies for users table
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Admins can read all users
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id 
    AND role = (SELECT role FROM users WHERE auth_user_id = auth.uid())
  );

-- Admins can update any user (including roles)
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can insert users
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Allow service role to bypass RLS (for backend operations)
CREATE POLICY "Service role can do everything" ON users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update RLS policies for securities table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON securities;

-- Anyone authenticated can read securities
CREATE POLICY "Authenticated users can read securities" ON securities
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins and issuers can insert securities
CREATE POLICY "Admins and issuers can insert securities" ON securities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid() AND u.role IN ('admin', 'issuer')
    )
  );

-- Admins and issuers can update securities
CREATE POLICY "Admins and issuers can update securities" ON securities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid() AND u.role IN ('admin', 'issuer')
    )
  );

-- Service role bypass
CREATE POLICY "Service role can do everything on securities" ON securities
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update RLS policies for allowlist table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON allowlist;

-- Anyone authenticated can read allowlist
CREATE POLICY "Authenticated users can read allowlist" ON allowlist
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins and issuers can manage allowlist
CREATE POLICY "Admins and issuers can manage allowlist" ON allowlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid() AND u.role IN ('admin', 'issuer')
    )
  );

-- Service role bypass
CREATE POLICY "Service role can do everything on allowlist" ON allowlist
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update RLS policies for token_balances table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON token_balances;

-- Anyone authenticated can read token balances
CREATE POLICY "Authenticated users can read token balances" ON token_balances
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Service role can do everything (balances updated by indexer)
CREATE POLICY "Service role can do everything on token balances" ON token_balances
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update RLS policies for transfers table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON transfers;

-- Anyone authenticated can read transfers
CREATE POLICY "Authenticated users can read transfers" ON transfers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Service role can do everything (transfers recorded by indexer)
CREATE POLICY "Service role can do everything on transfers" ON transfers
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update RLS policies for corporate_actions table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON corporate_actions;

-- Anyone authenticated can read corporate actions
CREATE POLICY "Authenticated users can read corporate actions" ON corporate_actions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can manage corporate actions
CREATE POLICY "Admins can manage corporate actions" ON corporate_actions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Service role bypass
CREATE POLICY "Service role can do everything on corporate actions" ON corporate_actions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update RLS policies for cap_table_snapshots table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON cap_table_snapshots;

-- Anyone authenticated can read cap table snapshots
CREATE POLICY "Authenticated users can read cap table snapshots" ON cap_table_snapshots
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Service role can do everything (snapshots created by system)
CREATE POLICY "Service role can do everything on cap table snapshots" ON cap_table_snapshots
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create a helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM users WHERE auth_user_id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Create a helper function to check if user has role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = user_id AND role = required_role
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create a helper function to check if user has any of the required roles
CREATE OR REPLACE FUNCTION has_any_role(user_id UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = user_id AND role = ANY(required_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON COLUMN users.auth_user_id IS 'Links to Supabase auth.users table';
COMMENT ON COLUMN users.email IS 'User email address, may be null for wallet-only auth';
COMMENT ON COLUMN users.role IS 'User role: admin, issuer, investor, or viewer';
COMMENT ON COLUMN users.email_verified IS 'Whether email has been verified via Supabase Auth';
COMMENT ON COLUMN users.wallet_verified IS 'Whether wallet ownership has been verified via signature';

