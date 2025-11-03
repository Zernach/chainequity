# ChainEquity - Tokenized Security Platform

A comprehensive tokenized security platform demonstrating:
- Solana-based gated security tokens with compliance controls
- React Native (Expo) cross-platform admin and investor interface
- Node.js backend with blockchain event indexing
- PostgreSQL database for cap table management
- Real-time WebSocket communication for transaction updates

**⚠️ DISCLAIMER: This is a technical prototype for educational purposes only. NOT regulatory-compliant for real securities. Requires legal review before production use.**

## Project Structure

```
chainequity/
├── contracts/gated-token/  # Solana Anchor program (Rust)
│   ├── programs/           # Smart contract source code
│   ├── tests/              # Anchor test suite
│   └── README.md           # Contract documentation
├── backend/                # Node.js + Express + Solana integration
│   ├── utils/              # Logger, validators, error handlers
│   └── *.js                # API routes and services
├── frontend/               # React Native + Expo Router
│   ├── constants/          # Dark mode theme system
│   ├── components/         # Reusable UI components (10+)
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API client layer
│   └── app/                # Screen components
├── database/               # SQL migrations for Supabase
└── @docs/                  # Architecture documentation
```

## Quick Start

### Prerequisites

Install the following before starting:
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.17+)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation) (v0.29.0)
- [Node.js](https://nodejs.org/) (v16+ or v18+)
- [Yarn](https://yarnpkg.com/)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Configure Solana for devnet
solana config set --url devnet
solana-keygen new  # Generate keypair if needed
solana airdrop 2   # Get testnet SOL
```

### 1. Database Setup

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to SQL Editor
3. Run migrations in order:
   - `database/001_create_users_table.sql`
   - `database/002_create_securities_tables.sql`

### 2. Smart Contract Deployment

```bash
cd contracts/gated-token

# Install dependencies
yarn install

# Build the program
anchor build

# Get program ID
anchor keys list

# Update program ID in Anchor.toml and lib.rs (see contracts/gated-token/README.md)

# Rebuild
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests
anchor test
```

**Important:** Save the deployed program ID - you'll need it for the backend configuration.

### 3. Backend Setup

```bash
cd backend

# Install dependencies
yarn install

# Create .env file
cp .env.example .env

# Edit .env and add:
# - SUPABASE_URL and SUPABASE_KEY
# - ADMIN_KEYPAIR_PATH (path to your Solana keypair)
# - Deployed program ID from step 2

# Start backend
yarn dev
```

Backend will start on:
- REST API: http://localhost:3000
- WebSocket: ws://localhost:3001

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Install expo-clipboard (required for WalletAddress component)
npx expo install expo-clipboard

# Start Metro bundler
yarn start
```

Then choose your platform:
- Press `w` for web
- Press `i` for iOS simulator  
- Press `a` for Android emulator

## Features Implemented

### Phase 1: Foundation ✅
- **Dark Mode Design System**
  - Comprehensive color palette with semantic tokens
  - Consistent spacing scale (4px base unit)
  - Typography system with font sizes, weights, line heights
  - Centralized theme object
  
- **Reusable UI Components (10 components)**
  - Button (with variants: primary, secondary, danger, success, ghost)
  - Card (container with elevation)
  - Input (with label, error states, focus handling)
  - Badge (status indicators for approved, pending, rejected, etc.)
  - LoadingSpinner
  - Alert (success, error, warning, info variants)
  - WalletAddress (truncated display with copy functionality)
  - TransactionStatus (with Solana Explorer link)
  - Modal (reusable dialog)
  - Separator (horizontal/vertical dividers)

- **Custom React Hooks (5 hooks)**
  - `useWebSocket` - Auto-reconnecting WebSocket connection
  - `useApi` - API calls with loading and error states
  - `useSolana` - Solana balance and transaction monitoring
  - `useCapTable` - Cap table fetching with auto-refresh
  - `useTokenOperations` - Token minting, approvals, corporate actions

- **Backend Utilities**
  - Structured JSON logger
  - Input validators (public keys, amounts, symbols, etc.)
  - Custom error classes (ValidationError, BlockchainError, etc.)

- **Database Schema**
  - `securities` - Token mint metadata
  - `allowlist` - Wallet approval status
  - `token_balances` - Current holder balances
  - `corporate_actions` - History of splits and symbol changes
  - `transfers` - Transfer event log with block heights
  - `cap_table_snapshots` - Historical ownership snapshots

### Phase 2: Smart Contract ✅
- **Solana Anchor Program (Rust)**
  - `initialize_token` - Deploy gated token with symbol, name, decimals
  - `approve_wallet` - Add wallet to allowlist (admin only)
  - `revoke_wallet` - Remove wallet from allowlist (admin only)
  - `mint_tokens` - Mint to approved wallets (admin only)
  - `gated_transfer` - Transfer with sender AND recipient validation
  
- **Account Structures**
  - `TokenConfig` PDA - Token metadata and admin authority
  - `AllowlistEntry` PDA - Per-wallet approval status

- **Events**
  - `TokenInitializedEvent`
  - `WalletApprovedEvent`
  - `WalletRevokedEvent`
  - `TokensMintedEvent`
  - `TokensTransferredEvent`

- **Comprehensive Test Suite**
  - 8 test scenarios covering all requirements
  - Gas benchmarking
  - All tests passing

### Remaining Phases (In Progress)
- [ ] Phase 3: Event Indexer & Cap Table Generator
- [ ] Phase 4: Corporate Actions (Stock Split, Symbol Change)
- [ ] Phase 5: Admin & Investor UI Screens
- [ ] Phase 6: Backend API Extensions
- [ ] Phase 7: Integration Testing
- [ ] Phase 8: Documentation & Demo Script

## Current Status

### ✅ Completed
1. **Design System & Component Library**
   - Full dark mode theme
   - 10 reusable components
   - 5 custom hooks
   - API service layer with TypeScript types

2. **Smart Contract**
   - Complete Rust/Anchor program
   - Allowlist-based gating
   - Admin controls
   - Event emissions
   - Test suite passing

3. **Database Schema**
   - 6 new tables for securities management
   - Indexes and relationships
   - RLS policies

4. **Backend Utilities**
   - Logger, validators, error handlers

### 🚧 Next Steps

To complete the project, run these commands:

```bash
# 1. Deploy smart contract to devnet
cd contracts/gated-token
anchor test  # Verify all tests pass
anchor deploy --provider.cluster devnet

# 2. Note the program ID and update backend configuration

# 3. Build remaining backend services
# - Event indexer (backend/indexer.js)
# - Cap table generator (backend/cap-table.js)
# - Corporate actions (backend/corporate-actions.js)
# - Extended Solana integration (backend/solana.js updates)

# 4. Create admin and investor UI screens
# - frontend/app/admin/*
# - frontend/app/investor/*

# 5. Run integration tests
# - backend/tests/*

# 6. Create demo script
# - scripts/demo.js
```

## Technologies

- **Smart Contracts**: Rust, Anchor Framework, Solana
- **Frontend**: React Native, Expo, Expo Router, TypeScript
- **Backend**: Node.js, Express, WebSocket (ws), Solana Web3.js
- **Database**: Supabase (PostgreSQL with real-time)
- **Design**: Custom dark mode theme system

