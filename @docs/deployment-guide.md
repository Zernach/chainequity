# ChainEquity Deployment Guide

Complete step-by-step instructions for deploying the full ChainEquity stack to Solana devnet/testnet.

## Prerequisites

### Required Software

```bash
# 1. Node.js (v18+)
node --version  # Should be >= 18.0.0
npm --version

# 2. Yarn package manager
npm install -g yarn
yarn --version

# 3. Rust (for smart contracts)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustc --version

# 4. Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
solana --version  # Should be >= 1.18.0

# 5. Anchor Framework
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
anchor --version  # Should be >= 0.29.0

# 6. PostgreSQL (or use Supabase cloud)
psql --version  # Should be >= 14.0
```

### Required Accounts

1. **Supabase Account**: Create at [https://supabase.com](https://supabase.com)
2. **Solana Wallet**: Generate admin keypair for deployment

---

## Phase 1: Database Setup

### 1.1 Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - Name: `chainequity`
   - Database Password: (generate strong password)
   - Region: Choose closest to you
4. Wait for project to be created (~2 minutes)

### 1.2 Get Connection Details

From your Supabase project dashboard:
1. Go to Settings → API
2. Copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public** key
   - **service_role** key (keep secure!)

### 1.3 Run Database Migrations

```bash
cd database

# Method 1: Using Supabase SQL Editor (recommended)
# 1. Go to SQL Editor in Supabase dashboard
# 2. Click "New query"
# 3. Copy contents of each file and run in order:

cat 001_create_users_table.sql
# Copy and run in Supabase SQL Editor

cat 002_create_securities_tables.sql
# Copy and run

cat 003_add_helper_functions.sql
# Copy and run

cat 004_add_auth_and_roles.sql
# Copy and run

cat 005_add_corporate_actions.sql
# Copy and run

# Method 2: Using psql (if using local PostgreSQL)
psql $DATABASE_URL -f 001_create_users_table.sql
psql $DATABASE_URL -f 002_create_securities_tables.sql
psql $DATABASE_URL -f 003_add_helper_functions.sql
psql $DATABASE_URL -f 004_add_auth_and_roles.sql
psql $DATABASE_URL -f 005_add_corporate_actions.sql
```

### 1.4 Verify Database Setup

```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show:
-- allowlist
-- corporate_actions
-- securities
-- token_balances
-- transfers
-- users
```

---

## Phase 2: Smart Contract Deployment

### 2.1 Generate Admin Keypair

```bash
# Generate new keypair for admin authority
solana-keygen new -o admin-keypair.json

# ⚠️ IMPORTANT: Save the seed phrase in a secure location!
# ⚠️ Add admin-keypair.json to .gitignore (already done)

# View public key
solana address -k admin-keypair.json
# Example output: 7sP8F... (this is your admin address)

# Set as default keypair
solana config set --keypair admin-keypair.json
```

### 2.2 Configure Solana CLI

```bash
# Set to devnet
solana config set --url https://api.devnet.solana.com

# Verify configuration
solana config get
# Should show:
# - RPC URL: https://api.devnet.solana.com
# - WebSocket URL: wss://api.devnet.solana.com
# - Keypair Path: /path/to/admin-keypair.json
```

### 2.3 Airdrop SOL for Deployment

```bash
# Request 2 SOL (devnet only)
solana airdrop 2

# Check balance
solana balance
# Should show: 2 SOL

# If airdrop fails (rate limit), use faucet:
# https://faucet.solana.com
```

### 2.4 Build Smart Contract

```bash
cd contracts/gated-token

# Install dependencies
yarn install

# Build the program
anchor build

# This creates:
# - target/deploy/gated_token.so (compiled program)
# - target/deploy/gated_token-keypair.json (program keypair)
# - target/idl/gated_token.json (IDL for clients)
# - target/types/gated_token.ts (TypeScript types)
```

### 2.5 Deploy to Devnet

```bash
# Deploy the program
anchor deploy --provider.cluster devnet

# Output will show:
# Program Id: 7zmjGpWX7frSmnFfyZuhhrfoLgV3yH44RJZbKob1FSJF
# (Your actual program ID will be different)

# Save this program ID!
```

### 2.6 Update Program ID

```bash
# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/gated_token-keypair.json)
echo "Program ID: $PROGRAM_ID"

# Update Anchor.toml
# Edit [programs.devnet] section:
#   gated_token = "YOUR_PROGRAM_ID_HERE"

# Update lib.rs
# Edit declare_id! macro:
#   declare_id!("YOUR_PROGRAM_ID_HERE");

# Rebuild with correct program ID
anchor build

# Verify (optional, recommended for production)
anchor deploy --provider.cluster devnet
```

### 2.7 Run Smart Contract Tests

```bash
# Test on local validator
anchor test

# Expected output:
# ✅ Test 1: Initialize token with metadata (PASS)
# ✅ Test 2: Approve wallet → Mint → Verify balance (PASS)
# ✅ Test 3: Transfer between approved → SUCCESS (PASS)
# ✅ Test 4: Transfer to non-approved → FAIL (PASS)
# ✅ Test 5: Transfer from non-approved → FAIL (PASS)
# ✅ Test 6: Revoke approval → Transfer fails (PASS)
# ✅ Test 7: Unauthorized admin action → FAIL (PASS)
# ✅ Test 8: Export cap table (PASS)

# All tests should pass!
```

---

## Phase 3: Backend Deployment

### 3.1 Configure Environment Variables

```bash
cd ../../backend

# Copy environment template
cp env.example .env

# Edit .env with your values:
nano .env
```

Update the following in `.env`:

```bash
# Database (from Supabase project)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=your_anon_public_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Solana
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
GATED_TOKEN_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID

# Admin
ADMIN_KEYPAIR_PATH=../admin-keypair.json

# Server
PORT=3000
NODE_ENV=development
```

### 3.2 Install Dependencies

```bash
yarn install
```

### 3.3 Build Backend

```bash
# Compile TypeScript
yarn build

# Output will be in dist/ directory
ls dist/
# Should show: server.js, indexer.js, etc.
```

### 3.4 Start Backend Server

```bash
# Development mode (with auto-reload)
yarn dev

# Production mode
yarn start

# Expected output:
# 🚀 ChainEquity Backend Starting...
# 📊 Database connected
# 🔗 Event indexer started
# 🌐 HTTP server running on http://localhost:3000
# 🔌 WebSocket available at ws://localhost:3000/ws
```

### 3.5 Verify Backend Health

```bash
# In a new terminal:
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

---

## Phase 4: Frontend Deployment

### 4.1 Configure Frontend Environment

```bash
cd ../frontend

# Create .env file
cat > .env << 'EOF'
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_WS_URL=ws://localhost:3000/ws
EXPO_PUBLIC_SOLANA_NETWORK=devnet
EXPO_PUBLIC_GATED_TOKEN_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
EOF
```

### 4.2 Install Dependencies

```bash
yarn install

# For iOS (Mac only)
cd ios && pod install && cd ..
```

### 4.3 Start Development Server

```bash
# Web
yarn web

# iOS (Mac + Xcode required)
yarn ios

# Android (Android Studio required)
yarn android

# Expo Go (mobile testing)
yarn start
```

### 4.4 Build for Production

```bash
# Web build
expo export --platform web
# Output in dist/ directory

# iOS build (requires Apple Developer account)
eas build --platform ios

# Android build
eas build --platform android
```

---

## Phase 5: Verification & Testing

### 5.1 End-to-End Smoke Test

```bash
# 1. Check backend health
curl http://localhost:3000/health

# 2. Check WebSocket connection
wscat -c ws://localhost:3000/ws
# Should connect successfully

# 3. Test authentication
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# 4. Initialize a test token (requires admin auth)
# Use the frontend admin dashboard for this

# 5. Verify indexer is running
curl http://localhost:3000/securities
# Should return empty array initially
```

### 5.2 Run Integration Tests

```bash
cd backend

# Run all tests
yarn test

# Run specific test suite
yarn test program-client.test.ts

# Run with coverage
yarn test --coverage
```

### 5.3 Check Logs

```bash
# Backend logs
tail -f backend/logs/chainequity.log

# Indexer logs
grep "EventIndexer" backend/logs/chainequity.log

# Error logs only
grep "ERROR" backend/logs/chainequity.log
```

---

## Phase 6: Production Deployment (Optional)

### 6.1 Deploy to Mainnet (⚠️ NOT RECOMMENDED FOR PROTOTYPE)

```bash
# ⚠️ WARNING: Only do this for production-ready applications
# ⚠️ Requires security audit, legal review, and proper licenses

# 1. Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# 2. Fund admin wallet with real SOL
# (Buy from exchange, DO NOT use airdrop)

# 3. Deploy program
cd contracts/gated-token
anchor deploy --provider.cluster mainnet

# 4. Update all environment variables to use mainnet
# 5. Run full test suite on mainnet-beta devnet first
```

### 6.2 Deploy Backend to Cloud

#### Option A: Railway (Recommended for MVP)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
cd backend
railway init

# 4. Add environment variables in Railway dashboard
# 5. Deploy
railway up
```

#### Option B: AWS / GCP / Azure

See cloud-specific deployment guides in `@docs/cloud-deployment.md`

### 6.3 Deploy Frontend

#### Web Hosting (Vercel/Netlify)

```bash
cd frontend

# Build
expo export --platform web

# Deploy to Vercel
vercel deploy dist/

# Or Netlify
netlify deploy --dir=dist/
```

#### Mobile App Stores

```bash
# iOS App Store
eas build --platform ios --profile production
eas submit --platform ios

# Google Play Store
eas build --platform android --profile production
eas submit --platform android
```

---

## Troubleshooting

### Common Issues

#### 1. "Insufficient funds for transaction"
```bash
# Solution: Request more SOL
solana airdrop 2
# Or use faucet: https://faucet.solana.com
```

#### 2. "Program ID mismatch"
```bash
# Solution: Ensure program ID is updated in:
# - contracts/gated-token/Anchor.toml
# - contracts/gated-token/programs/gated-token/src/lib.rs
# - backend/.env (GATED_TOKEN_PROGRAM_ID)
# - frontend/.env (EXPO_PUBLIC_GATED_TOKEN_PROGRAM_ID)

# Then rebuild:
cd contracts/gated-token
anchor build
```

#### 3. "Database connection failed"
```bash
# Solution: Verify Supabase credentials
# 1. Check SUPABASE_URL and SUPABASE_KEY in backend/.env
# 2. Ensure Supabase project is active
# 3. Check network connectivity
```

#### 4. "WebSocket connection refused"
```bash
# Solution: Ensure backend is running on correct port
# 1. Check PORT in backend/.env
# 2. Update EXPO_PUBLIC_WS_URL in frontend/.env
# 3. Restart backend: yarn dev
```

#### 5. "Anchor build fails"
```bash
# Solution: Clear cache and rebuild
rm -rf target/
anchor clean
anchor build
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Database health
# Check Supabase dashboard

# Smart contract status
solana program show PROGRAM_ID
```

### Log Rotation

```bash
# Setup logrotate (Linux)
sudo cat > /etc/logrotate.d/chainequity << 'EOF'
/var/log/chainequity/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

### Backup Strategy

```bash
# Database: Supabase auto-backups (enabled by default)
# Smart contract: Program is immutable (no backups needed)
# Admin keypair: Store securely in AWS Secrets Manager or similar
```

---

## Security Checklist

- [ ] Admin keypair stored securely (not in Git)
- [ ] Supabase service_role key kept secret
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled on API
- [ ] HTTPS/WSS enabled (production)
- [ ] Input validation on all endpoints
- [ ] SQL injection protection verified
- [ ] Authentication required on admin endpoints
- [ ] Smart contract audited (if mainnet)
- [ ] Secrets rotated regularly

---

## Next Steps

After successful deployment:

1. **Test Admin Dashboard**: Navigate to `http://localhost:19006/admin` and test all functions
2. **Initialize First Token**: Use admin dashboard to create a test security token
3. **Approve Test Wallets**: Add test wallets to allowlist
4. **Test Minting**: Mint tokens to approved wallets
5. **Test Transfers**: Execute gated transfers between approved wallets
6. **Test Corporate Actions**: Execute stock split and symbol change
7. **Export Cap Table**: Verify cap-table generation works
8. **Monitor Logs**: Watch for any errors or warnings

---

## Support

- **Documentation**: See `@docs/` directory
- **Issues**: Create GitHub issue
- **Email**: team@chainequity.io (example)
- **Discord**: [ChainEquity Community](https://discord.gg/chainequity) (example)

---

## Appendix: Quick Reference Commands

```bash
# Solana Commands
solana config get                    # View current configuration
solana balance                       # Check SOL balance
solana airdrop 2                     # Request 2 SOL (devnet)
solana address -k FILE.json          # Get public key from keypair

# Anchor Commands
anchor build                         # Build program
anchor deploy --provider.cluster devnet  # Deploy to devnet
anchor test                          # Run tests
anchor clean                         # Clean build artifacts

# Backend Commands
cd backend
yarn install                         # Install dependencies
yarn build                           # Build TypeScript
yarn dev                             # Start development server
yarn start                           # Start production server
yarn test                            # Run tests

# Frontend Commands
cd frontend
yarn install                         # Install dependencies
yarn web                             # Start web development server
yarn ios                             # Start iOS simulator
yarn android                         # Start Android emulator
expo export --platform web           # Build for web production

# Database Commands
psql $DATABASE_URL -f migration.sql  # Run migration
psql $DATABASE_URL -c "SELECT ..."   # Execute SQL query
```

---

**Deployment complete!** 🎉

Your ChainEquity instance should now be running on:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:19006
- **Admin Dashboard**: http://localhost:19006/admin
- **Solana Program**: YOUR_PROGRAM_ID on devnet

