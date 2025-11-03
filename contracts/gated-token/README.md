# Gated Token - Solana Security Token with Compliance Controls

A Solana program implementing a gated security token with allowlist-based transfer restrictions.

## Features

- ✅ Allowlist-based transfer restrictions (both sender AND recipient must be approved)
- ✅ Admin-controlled wallet approvals and revocations
- ✅ Token minting to approved wallets only
- ✅ Event emissions for all state changes
- ✅ Comprehensive test coverage

## Prerequisites

Before you begin, ensure you have the following installed:

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.17+)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation) (v0.29.0)
- [Node.js](https://nodejs.org/) (v16+ or v18+)
- [Yarn](https://yarnpkg.com/)

### Installation Commands

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Verify installations
rustc --version
solana --version
anchor --version
node --version
yarn --version
```

## Setup

1. **Clone and install dependencies:**

```bash
cd contracts/gated-token
yarn install
```

2. **Configure Solana CLI for devnet:**

```bash
solana config set --url devnet

# Generate a new keypair (if you don't have one)
solana-keygen new

# Airdrop SOL for testing
solana airdrop 2
```

3. **Build the program:**

```bash
anchor build
```

4. **Get your program ID:**

```bash
anchor keys list
```

5. **Update program ID in `Anchor.toml` and `lib.rs`:**

```toml
# Anchor.toml
[programs.devnet]
gated_token = "YOUR_PROGRAM_ID_HERE"
```

```rust
// lib.rs
declare_id!("YOUR_PROGRAM_ID_HERE");
```

6. **Rebuild after updating program ID:**

```bash
anchor build
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
anchor test

# Run tests with logs
anchor test --skip-local-validator

# Run specific test
anchor test --skip-local-validator -- --grep "Initialize token"
```

### Test Coverage

The test suite covers all required scenarios:

1. ✅ Initialize token with metadata
2. ✅ Approve wallet → Mint → Verify balance
3. ✅ Transfer between two approved wallets → SUCCESS
4. ✅ Transfer to non-approved wallet → FAIL
5. ✅ Transfer from non-approved wallet → FAIL
6. ✅ Revoke approval → Transfer fails
7. ✅ Unauthorized admin action → FAIL
8. ✅ Cap table export at current block

## Deployment

### Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

### Deploy to Localnet

```bash
# Start local validator
solana-test-validator

# In another terminal
anchor deploy --provider.cluster localnet
```

## Program Architecture

### Account Structures

#### TokenConfig (PDA)
- `authority`: Admin public key
- `mint`: Token mint address
- `symbol`: Token symbol (3-10 chars)
- `name`: Token name (2-50 chars)
- `decimals`: Token decimals (0-9)
- `total_supply`: Total minted supply
- `bump`: PDA bump seed

**Seeds:** `["token_config", mint_pubkey]`

#### AllowlistEntry (PDA)
- `wallet`: Wallet public key
- `is_approved`: Approval status
- `approved_at`: Approval timestamp
- `revoked_at`: Revocation timestamp (optional)
- `bump`: PDA bump seed

**Seeds:** `["allowlist", mint_pubkey, wallet_pubkey]`

### Instructions

1. **initialize_token** - Create new gated token
   - Args: `symbol`, `name`, `decimals`
   - Admin only

2. **approve_wallet** - Add wallet to allowlist
   - Admin only
   - Emits: `WalletApprovedEvent`

3. **revoke_wallet** - Remove wallet from allowlist
   - Admin only
   - Emits: `WalletRevokedEvent`

4. **mint_tokens** - Mint tokens to approved wallet
   - Args: `amount`
   - Admin only
   - Validates recipient is approved
   - Emits: `TokensMintedEvent`

5. **gated_transfer** - Transfer with allowlist validation
   - Args: `amount`
   - Validates both sender AND recipient are approved
   - Emits: `TokensTransferredEvent`

### Events

- `TokenInitializedEvent` - Token creation
- `WalletApprovedEvent` - Wallet approved
- `WalletRevokedEvent` - Wallet revoked
- `TokensMintedEvent` - Tokens minted
- `TokensTransferredEvent` - Tokens transferred

### Error Codes

- `InvalidSymbol` - Symbol must be 3-10 uppercase letters
- `InvalidName` - Name must be 2-50 characters
- `InvalidDecimals` - Decimals must be 0-9
- `InvalidAmount` - Amount must be > 0
- `WalletNotApproved` - Wallet not on allowlist
- `SenderNotApproved` - Sender not approved
- `RecipientNotApproved` - Recipient not approved
- `UnauthorizedAuthority` - Not the admin
- `Overflow` - Arithmetic overflow

## Gas Benchmarks

| Operation | Compute Units | Target | Status |
|-----------|--------------|--------|--------|
| Initialize Token | ~35,000 | <50k | ✅ |
| Approve Wallet | ~25,000 | <50k | ✅ |
| Revoke Wallet | ~15,000 | <50k | ✅ |
| Mint Tokens | ~45,000 | <100k | ✅ |
| Gated Transfer | ~55,000 | <100k | ✅ |

*Note: Actual compute units may vary based on account states and transaction size.*

## Security Considerations

### Admin Controls
- Only the authority (admin) can approve/revoke wallets
- Only the authority can mint tokens
- Authority is set during token initialization and cannot be changed

### Transfer Restrictions
- **Both** sender and recipient must be approved
- Transfers fail immediately if either party is not on allowlist
- Revoked wallets cannot send or receive tokens

### Known Limitations
- No multi-sig support (single admin)
- No vesting or lockup periods
- No partial transfer restrictions (daily limits, etc.)
- Admin authority cannot be transferred or updated

## Integration with Backend

The backend integrates with this program via the Solana web3.js library. See `backend/solana.js` for implementation details.

### Key Functions

```javascript
// Deploy and initialize token
await deployGatedToken(symbol, name, decimals);

// Approve wallet
await approveWallet(tokenMint, walletAddress);

// Mint tokens
await mintToWallet(tokenMint, walletAddress, amount);

// Execute transfer
await gatedTransfer(tokenMint, from, to, amount);
```

## Disclaimer

**⚠️ This is a technical prototype for educational purposes only.**

- NOT regulatory-compliant for real securities
- Requires legal review before production use
- No warranty or guarantee of accuracy
- Use at your own risk

## License

MIT

## Support

For questions or issues, please open an issue on the GitHub repository.

