# ChainEquity Smart Contracts Reference

## Overview

ChainEquity uses a Solana program (smart contract) built with the Anchor framework (v0.29+). The program implements a **gated security token** with transfer restrictions enforced by an on-chain allowlist. This enables compliant tokenized securities with programmable access controls.

## Program ID

- **Devnet**: `7zmjGpWX7frSmnFfyZuhhrfoLgV3yH44RJZbKob1FSJF` (example - update after deployment)
- **Testnet**: TBD
- **Mainnet**: NOT DEPLOYED (prototype only)

## Architecture

The program uses a **PDA (Program Derived Address)** architecture for deterministic account discovery and enhanced security.

```
┌─────────────────────────────────────────────────────────────┐
│                  GATED TOKEN PROGRAM                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌────────────────┐                  │
│  │ TokenConfig  │      │ AllowlistEntry │                  │
│  │     (PDA)    │      │      (PDA)     │                  │
│  ├──────────────┤      ├────────────────┤                  │
│  │ authority    │      │ wallet         │                  │
│  │ mint         │      │ is_approved    │                  │
│  │ symbol       │      │ approved_at    │                  │
│  │ name         │      │ revoked_at     │                  │
│  │ decimals     │      │ bump           │                  │
│  │ total_supply │      └────────────────┘                  │
│  │ bump         │                                           │
│  └──────────────┘      ┌────────────────┐                  │
│                        │  SplitConfig   │                  │
│                        │      (PDA)     │                  │
│                        ├────────────────┤                  │
│                        │ original_mint  │                  │
│                        │ new_mint       │                  │
│                        │ split_ratio    │                  │
│                        │ executed_at    │                  │
│                        │ executed_by    │                  │
│                        │ bump           │                  │
│                        └────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Account Structures

### TokenConfig

Stores token metadata and configuration for each gated token.

**Seeds**: `["token_config", mint]`

| Field | Type | Description |
|-------|------|-------------|
| authority | Pubkey | Admin who can manage the token |
| mint | Pubkey | SPL Token mint address |
| symbol | String | Token ticker (3-10 characters) |
| name | String | Token name (2-50 characters) |
| decimals | u8 | Token decimals (0-9, typically 9) |
| total_supply | u64 | Current total supply (with decimals) |
| bump | u8 | PDA bump seed |

**Space**: `8 + 32 + 32 + 40 + 100 + 1 + 8 + 1 = 222 bytes`

### AllowlistEntry

Tracks approval status for each wallet per token.

**Seeds**: `["allowlist", mint, wallet]`

| Field | Type | Description |
|-------|------|-------------|
| wallet | Pubkey | Wallet public key |
| is_approved | bool | Current approval status |
| approved_at | i64 | Unix timestamp of approval |
| revoked_at | Option\<i64\> | Unix timestamp of revocation (if any) |
| bump | u8 | PDA bump seed |

**Space**: `8 + 32 + 1 + 8 + 9 + 1 = 59 bytes`

### SplitConfig

Records stock split configuration for migration tracking.

**Seeds**: `["split_config", old_mint, new_mint]`

| Field | Type | Description |
|-------|------|-------------|
| original_mint | Pubkey | Old token mint address |
| new_mint | Pubkey | New token mint address |
| split_ratio | u64 | Multiplication factor (e.g., 7 for 7-for-1) |
| executed_at | i64 | Unix timestamp of execution |
| executed_by | Pubkey | Authority who executed the split |
| bump | u8 | PDA bump seed |

**Space**: `8 + 32 + 32 + 8 + 8 + 32 + 1 = 121 bytes`

## Instructions

### 1. initialize_token

Creates a new gated security token with allowlist controls.

**Parameters**:
- `symbol: String` - Token ticker (e.g., "ACME")
- `name: String` - Token name (e.g., "ACME Security Token")
- `decimals: u8` - Token decimals (typically 9 for Solana)

**Accounts**:
- `authority` (signer, mut) - Admin wallet
- `mint` (init) - New SPL Token mint
- `token_config` (init, PDA) - Token configuration account
- `token_program` - SPL Token program
- `system_program` - Solana System program
- `rent` - Rent sysvar

**Validations**:
- Symbol: 3-10 characters
- Name: 2-50 characters
- Decimals: 0-9

**Events**: `TokenInitializedEvent`

**Example**:
```typescript
await program.methods
    .initializeToken("ACME", "ACME Security Token", 9)
    .accounts({
        authority: adminKeypair.publicKey,
        mint: mintKeypair.publicKey,
        tokenConfig,
        // ...
    })
    .signers([mintKeypair])
    .rpc();
```

### 2. approve_wallet

Adds a wallet to the allowlist, enabling it to send/receive tokens.

**Parameters**: None

**Accounts**:
- `authority` (signer, mut) - Admin (must match token_config.authority)
- `wallet` - Wallet to approve
- `token_config` (PDA) - Token configuration
- `allowlist_entry` (init, PDA) - New allowlist entry
- `system_program` - Solana System program

**Validations**:
- Only authority can call
- Wallet must not already be approved

**Events**: `WalletApprovedEvent`

### 3. revoke_wallet

Removes a wallet from the allowlist, preventing future transfers.

**Parameters**: None

**Accounts**:
- `authority` (signer, mut) - Admin
- `wallet` - Wallet to revoke
- `token_config` (PDA) - Token configuration
- `allowlist_entry` (mut, PDA) - Existing allowlist entry

**Validations**:
- Only authority can call
- Wallet must be currently approved

**Events**: `WalletRevokedEvent`

### 4. mint_tokens

Mints tokens to an approved wallet.

**Parameters**:
- `amount: u64` - Amount to mint (with decimals)

**Accounts**:
- `authority` (signer, mut) - Admin
- `recipient` - Receiving wallet
- `token_config` (mut, PDA) - Token configuration
- `mint` (mut) - Token mint
- `recipient_token_account` (mut) - Recipient's token account
- `recipient_allowlist_entry` (PDA) - Recipient's allowlist entry
- `token_program` - SPL Token program

**Validations**:
- Only authority can call
- Recipient must be approved
- Amount > 0

**Events**: `TokensMintedEvent`

**Effects**:
- Updates `token_config.total_supply`
- Mints tokens to recipient's account

### 5. gated_transfer

Transfers tokens between two approved wallets.

**Parameters**:
- `amount: u64` - Amount to transfer

**Accounts**:
- `authority` (signer) - Sender wallet
- `recipient` - Receiving wallet
- `token_config` (PDA) - Token configuration
- `mint` - Token mint
- `from_token_account` (mut) - Sender's token account
- `to_token_account` (mut) - Recipient's token account
- `sender_allowlist_entry` (PDA) - Sender's allowlist entry
- `recipient_allowlist_entry` (PDA) - Recipient's allowlist entry
- `token_program` - SPL Token program

**Validations**:
- Sender must be approved
- Recipient must be approved
- Amount > 0
- Sufficient balance

**Events**: `TokensTransferredEvent`

**Critical**: Both sender AND recipient must be on the allowlist. This is the core compliance mechanism.

### 6. execute_stock_split (Corporate Action)

Creates a new token with multiplied supply for N-for-1 stock splits.

**Parameters**:
- `split_ratio: u64` - Multiplication factor (e.g., 7 for 7-for-1)
- `new_symbol: String` - New token symbol
- `new_name: String` - New token name

**Accounts**:
- `authority` (signer, mut) - Admin
- `old_token_config` (PDA) - Old token configuration
- `new_mint` (init) - New SPL Token mint
- `new_token_config` (init, PDA) - New token configuration
- `split_config` (init, PDA) - Split configuration record
- `token_program` - SPL Token program
- `system_program` - Solana System program
- `rent` - Rent sysvar

**Validations**:
- Only authority can call
- Split ratio > 0
- Valid symbol and name

**Events**: `StockSplitExecutedEvent`

**Implementation**: Deploy new token + migration approach (see Corporate Actions docs).

### 7. migrate_holder_split

Migrates a single holder's balance to the new token after a split.

**Parameters**:
- `old_balance: u64` - Holder's balance in old token

**Accounts**:
- `authority` (signer, mut) - Admin
- `holder` - Holder's wallet
- `split_config` (PDA) - Split configuration
- `new_mint` (mut) - New token mint
- `new_token_config` (mut, PDA) - New token configuration
- `holder_new_token_account` (mut) - Holder's new token account
- `token_program` - SPL Token program

**Effects**:
- Mints `old_balance * split_ratio` to holder's new account
- Updates `new_token_config.total_supply`

**Events**: `HolderMigratedEvent`

**Note**: Called multiple times (once per holder) after `execute_stock_split`.

### 8. update_token_metadata (Corporate Action)

Changes the token symbol and name (mutable metadata).

**Parameters**:
- `new_symbol: String` - New token symbol
- `new_name: String` - New token name

**Accounts**:
- `authority` (signer, mut) - Admin
- `token_config` (mut, PDA) - Token configuration

**Validations**:
- Only authority can call
- Valid symbol (3-10 characters)
- Valid name (2-50 characters)

**Events**: `SymbolChangedEvent`

**Effects**:
- Updates `token_config.symbol`
- Updates `token_config.name`
- All balances remain unchanged

## Events

All events are emitted using Anchor's `#[event]` macro and can be parsed from transaction logs.

### TokenInitializedEvent
```rust
pub struct TokenInitializedEvent {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
}
```

### WalletApprovedEvent
```rust
pub struct WalletApprovedEvent {
    pub token_mint: Pubkey,
    pub wallet: Pubkey,
    pub approved_by: Pubkey,
    pub timestamp: i64,
}
```

### WalletRevokedEvent
```rust
pub struct WalletRevokedEvent {
    pub token_mint: Pubkey,
    pub wallet: Pubkey,
    pub revoked_by: Pubkey,
    pub timestamp: i64,
}
```

### TokensMintedEvent
```rust
pub struct TokensMintedEvent {
    pub token_mint: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub new_supply: u64,
}
```

### TokensTransferredEvent
```rust
pub struct TokensTransferredEvent {
    pub token_mint: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}
```

### StockSplitExecutedEvent
```rust
pub struct StockSplitExecutedEvent {
    pub old_mint: Pubkey,
    pub new_mint: Pubkey,
    pub split_ratio: u64,
    pub authority: Pubkey,
    pub timestamp: i64,
}
```

### HolderMigratedEvent
```rust
pub struct HolderMigratedEvent {
    pub wallet: Pubkey,
    pub old_balance: u64,
    pub new_balance: u64,
    pub split_ratio: u64,
}
```

### SymbolChangedEvent
```rust
pub struct SymbolChangedEvent {
    pub mint: Pubkey,
    pub old_symbol: String,
    pub new_symbol: String,
    pub old_name: String,
    pub new_name: String,
    pub authority: Pubkey,
    pub timestamp: i64,
}
```

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 6000 | InvalidSymbol | Symbol must be 3-10 characters |
| 6001 | InvalidName | Name must be 2-50 characters |
| 6002 | InvalidDecimals | Decimals must be 0-9 |
| 6003 | InvalidAmount | Amount must be > 0 |
| 6004 | WalletNotApproved | Wallet not on allowlist |
| 6005 | SenderNotApproved | Sender not on allowlist |
| 6006 | RecipientNotApproved | Recipient not on allowlist |
| 6007 | UnauthorizedAuthority | Only authority can call |
| 6008 | Overflow | Arithmetic overflow |
| 6009 | InvalidSplitRatio | Split ratio must be > 0 |

## Gas Costs (Compute Units)

Estimated compute units per instruction on Solana devnet:

| Instruction | Compute Units | Target | Status |
|-------------|--------------|--------|--------|
| initialize_token | ~85,000 | <100k | ✅ Pass |
| approve_wallet | ~35,000 | <50k | ✅ Pass |
| revoke_wallet | ~20,000 | <50k | ✅ Pass |
| mint_tokens | ~75,000 | <100k | ✅ Pass |
| gated_transfer | ~85,000 | <100k | ✅ Pass |
| execute_stock_split | ~120,000 | N/A | - |
| migrate_holder_split | ~80,000 | N/A | - |
| update_token_metadata | ~25,000 | <50k | ✅ Pass |

**Note**: Actual compute units may vary based on:
- Account data size
- Network conditions
- Number of operations per instruction

## Deployment

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### Build & Deploy
```bash
cd contracts/gated-token

# Build the program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID
solana address -k target/deploy/gated_token-keypair.json
```

### Post-Deployment
1. Update `Anchor.toml` with the deployed program ID
2. Update `lib.rs` `declare_id!` macro with the program ID
3. Rebuild: `anchor build`
4. Update `.env` files in backend and frontend with `GATED_TOKEN_PROGRAM_ID`

## Testing

```bash
cd contracts/gated-token
anchor test
```

See `tests/gated-token.ts` for comprehensive test scenarios covering:
- Token initialization
- Wallet approval/revocation
- Minting to approved wallets
- Gated transfers (success and failure cases)
- Authorization checks
- Cap table exports

## Security Considerations

### Access Control
- All admin operations require `authority` signature
- Authority is set at initialization and stored in `TokenConfig`
- No multi-sig support (single point of failure)
- No emergency pause mechanism

### Transfer Gating
- Both sender AND recipient must be on allowlist
- Checks performed on-chain (cannot be bypassed)
- Allowlist state stored in program-owned PDAs
- Revoked wallets immediately lose transfer ability

### Upgradability
- Program is upgradeable by default (Anchor)
- Upgrade authority can be transferred or disabled
- Account data structures are versioned via discriminators

### Known Limitations
- Single admin authority (no governance)
- No time-locks on admin actions
- Stock splits require manual holder migration (gas intensive)
- No automatic compliance rules (KYC/AML must be off-chain)

## Integration Example

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { GatedToken } from './target/types/gated_token';

// Initialize
const connection = new Connection('https://api.devnet.solana.com');
const program = new Program<GatedToken>(idl, programId, provider);

// Get token config PDA
const [tokenConfig] = await PublicKey.findProgramAddress(
    [Buffer.from('token_config'), mint.toBuffer()],
    programId
);

// Check allowlist status
const [allowlistEntry] = await PublicKey.findProgramAddress(
    [Buffer.from('allowlist'), mint.toBuffer(), wallet.toBuffer()],
    programId
);

try {
    const entry = await program.account.allowlistEntry.fetch(allowlistEntry);
    console.log('Approved:', entry.isApproved);
} catch {
    console.log('Not on allowlist');
}
```

## Resources

- **Anchor Framework**: https://www.anchor-lang.com/
- **Solana Documentation**: https://docs.solana.com/
- **SPL Token Program**: https://spl.solana.com/token
- **Program Repository**: `/contracts/gated-token/`
- **Test Suite**: `/contracts/gated-token/tests/gated-token.ts`

## Disclaimer

⚠️ **This is a technical prototype for educational purposes only.** ⚠️

This program is NOT production-ready for real securities. Requirements for production use:
- Legal review and compliance assessment
- Security audit by professional auditors
- KYC/AML integration
- Regulatory approval (varies by jurisdiction)
- Multi-sig or governance for admin operations
- Emergency pause and upgrade mechanisms
- Comprehensive testing on mainnet-beta

Do not use this program for real tokenized securities without proper legal and technical due diligence.

