# Epic 2: Gated Token Smart Contract

**Status:** ✅ COMPLETE  
**Goal:** Implement and test the Solana smart contract with allowlist-based transfer restrictions. Deploy to devnet and verify all core instructions work correctly.

---

## Epic Goal (Expanded)

This epic delivers the core smart contract that enforces transfer restrictions for tokenized securities. Using the Anchor framework on Solana, the program implements a gated SPL token where only approved wallets can send or receive tokens. The contract uses Program Derived Addresses (PDAs) for deterministic account discovery and provides administrative instructions for managing allowlists, minting tokens, and enforcing compliance rules. All instructions are thoroughly tested with comprehensive test scenarios covering both success and failure cases.

---

## Stories

### Story 2.1: Anchor Project Setup & Configuration

**As a** blockchain developer,  
**I want** an Anchor project configured for Solana devnet deployment,  
**so that** I can develop and test the gated token program efficiently.

#### Acceptance Criteria

1. Directory `contracts/gated-token/` created with Anchor project structure
2. File `Anchor.toml` configured with program name, cluster settings (devnet), and script aliases
3. File `Cargo.toml` workspace configuration with program dependencies (anchor-lang, anchor-spl)
4. File `programs/gated-token/Cargo.toml` created with program-specific dependencies
5. File `package.json` created with test dependencies (@coral-xyz/anchor, @solana/web3.js, mocha, chai)
6. File `tsconfig.json` configured for Anchor TypeScript tests
7. Program ID placeholder in `lib.rs` via `declare_id!` macro
8. Build command `anchor build` successfully compiles program
9. Test command `anchor test` runs test suite
10. `.gitignore` configured to exclude build artifacts (target/, test-ledger/, .anchor/)

**Status:** ✅ Complete

---

### Story 2.2: Token Config PDA & Account Structure

**As a** blockchain developer,  
**I want** a TokenConfig account structure that stores token metadata and admin authority,  
**so that** each gated token has immutable configuration and clear ownership.

#### Acceptance Criteria

1. `TokenConfig` struct defined in `lib.rs` with fields: authority (Pubkey), mint (Pubkey), symbol (String), name (String), decimals (u8), total_supply (u64), bump (u8)
2. Struct derives required traits: `#[account]`, `AnchorSerialize`, `AnchorDeserialize`
3. Space calculated correctly: `8 + 32 + 32 + 40 + 100 + 1 + 8 + 1 = 222 bytes`
4. PDA seeds defined: `["token_config", mint]`
5. TokenConfig account can be created with `init` constraint in instruction
6. TokenConfig account can be queried using `findProgramAddress`
7. Authority field used for access control in all admin instructions
8. Total_supply field tracked and updated on minting
9. Symbol validated: 3-10 characters, alphanumeric
10. Name validated: 2-50 characters

**Status:** ✅ Complete

---

### Story 2.3: Allowlist Entry PDA & Account Structure

**As a** blockchain developer,  
**I want** an AllowlistEntry account structure that tracks approval status per wallet,  
**so that** the system can verify if a wallet is authorized to transfer tokens.

#### Acceptance Criteria

1. `AllowlistEntry` struct defined with fields: wallet (Pubkey), is_approved (bool), approved_at (i64), revoked_at (Option<i64>), bump (u8)
2. Struct derives required traits for serialization
3. Space calculated: `8 + 32 + 1 + 8 + 9 + 1 = 59 bytes`
4. PDA seeds defined: `["allowlist", mint, wallet]`
5. AllowlistEntry can be created for new wallet approvals
6. AllowlistEntry can be updated to mark revocation
7. `is_approved` flag controls transfer eligibility
8. Timestamps stored as Unix epoch (i64)
9. `revoked_at` is `None` for active approvals, `Some(timestamp)` when revoked
10. Allowlist entries queryable by mint and wallet combination

**Status:** ✅ Complete

---

### Story 2.4: Initialize Token Instruction

**As an** admin,  
**I want** an instruction to initialize a new gated token with symbol, name, and decimals,  
**so that** I can create security tokens with custom metadata and transfer restrictions.

#### Acceptance Criteria

1. `initialize_token` instruction defined with parameters: `symbol: String`, `name: String`, `decimals: u8`
2. Accounts required: authority (signer, mut), mint (init), token_config (init, PDA), token_program, system_program, rent
3. Mint account initialized with proper authority and decimals
4. TokenConfig account created with provided metadata
5. TokenConfig.authority set to instruction authority
6. TokenConfig.total_supply initialized to 0
7. Input validation: symbol 3-10 chars, name 2-50 chars, decimals 0-9
8. Custom errors thrown for validation failures: `InvalidSymbol`, `InvalidName`, `InvalidDecimals`
9. Event `TokenInitializedEvent` emitted with all initialization data
10. Instruction callable by any signer (becomes the authority for future operations)

**Status:** ✅ Complete

---

### Story 2.5: Approve Wallet Instruction

**As an** admin,  
**I want** an instruction to approve a wallet for the allowlist,  
**so that** only KYC-verified users can participate in token transfers.

#### Acceptance Criteria

1. `approve_wallet` instruction defined (no parameters needed - wallet is in accounts)
2. Accounts required: authority (signer, mut), wallet (target wallet to approve), token_config (PDA), allowlist_entry (init, PDA), system_program
3. Authority validation: `token_config.authority == authority.key()` (throws `UnauthorizedAuthority` if mismatch)
4. AllowlistEntry account created with `is_approved = true`
5. `approved_at` timestamp set to current clock time (`Clock::get()?.unix_timestamp`)
6. `revoked_at` set to `None`
7. Event `WalletApprovedEvent` emitted with token mint, wallet address, approved_by, timestamp
8. Instruction fails if called by non-authority
9. Instruction succeeds even if wallet already has an allowlist entry (idempotent)
10. Gas cost under 50,000 compute units

**Status:** ✅ Complete

---

### Story 2.6: Revoke Wallet Instruction

**As an** admin,  
**I want** an instruction to revoke a wallet's allowlist approval,  
**so that** I can remove access for users who no longer meet compliance requirements.

#### Acceptance Criteria

1. `revoke_wallet` instruction defined
2. Accounts required: authority (signer, mut), wallet, token_config (PDA), allowlist_entry (mut, PDA)
3. Authority validation enforced
4. AllowlistEntry.is_approved set to `false`
5. AllowlistEntry.revoked_at set to current timestamp
6. Event `WalletRevokedEvent` emitted with token mint, wallet, revoked_by, timestamp
7. Instruction fails if called by non-authority
8. Instruction fails if allowlist_entry doesn't exist
9. Revoked wallets immediately blocked from future transfers
10. Gas cost under 50,000 compute units

**Status:** ✅ Complete

---

### Story 2.7: Mint Tokens Instruction

**As an** admin,  
**I want** an instruction to mint tokens to an approved wallet,  
**so that** I can issue securities to investors after KYC verification.

#### Acceptance Criteria

1. `mint_tokens` instruction defined with parameter: `amount: u64`
2. Accounts required: authority (signer, mut), recipient, token_config (mut, PDA), mint (mut), recipient_token_account (mut), recipient_allowlist_entry (PDA), token_program
3. Authority validation enforced
4. Recipient allowlist check: `recipient_allowlist_entry.is_approved == true` (throws `RecipientNotApproved` if false)
5. Amount validation: `amount > 0` (throws `InvalidAmount` if zero)
6. Tokens minted to recipient's token account using `mint_to` CPI to SPL Token program
7. TokenConfig.total_supply incremented by amount
8. Event `TokensMintedEvent` emitted with token mint, recipient, amount, new_supply
9. Overflow protection: addition checked to prevent u64 overflow
10. Gas cost under 100,000 compute units

**Status:** ✅ Complete

---

### Story 2.8: Gated Transfer Instruction

**As a** token holder,  
**I want** an instruction to transfer tokens to another approved wallet,  
**so that** I can sell or transfer my securities to verified buyers.

#### Acceptance Criteria

1. `gated_transfer` instruction defined with parameter: `amount: u64`
2. Accounts required: authority (signer), recipient, token_config (PDA), mint, from_token_account (mut), to_token_account (mut), sender_allowlist_entry (PDA), recipient_allowlist_entry (PDA), token_program
3. Sender allowlist check: `sender_allowlist_entry.is_approved == true` (throws `SenderNotApproved`)
4. Recipient allowlist check: `recipient_allowlist_entry.is_approved == true` (throws `RecipientNotApproved`)
5. Amount validation: `amount > 0`
6. Transfer executed using `transfer` CPI to SPL Token program
7. Event `TokensTransferredEvent` emitted with token mint, from, to, amount
8. Instruction fails if either party not approved (core compliance mechanism)
9. Instruction fails if sender lacks sufficient balance (handled by SPL Token program)
10. Gas cost under 100,000 compute units

**Status:** ✅ Complete

---

### Story 2.9: Error Codes & Event Definitions

**As a** blockchain developer,  
**I want** custom error codes and structured events,  
**so that** clients can handle errors gracefully and the indexer can process events.

#### Acceptance Criteria

1. Error enum defined with 9 error codes: `InvalidSymbol`, `InvalidName`, `InvalidDecimals`, `InvalidAmount`, `WalletNotApproved`, `SenderNotApproved`, `RecipientNotApproved`, `UnauthorizedAuthority`, `Overflow`
2. Each error has descriptive message (e.g., "Symbol must be 3-10 characters")
3. Event `TokenInitializedEvent` defined with fields: authority, mint, symbol, name, decimals
4. Event `WalletApprovedEvent` defined with fields: token_mint, wallet, approved_by, timestamp
5. Event `WalletRevokedEvent` defined with fields: token_mint, wallet, revoked_by, timestamp
6. Event `TokensMintedEvent` defined with fields: token_mint, recipient, amount, new_supply
7. Event `TokensTransferredEvent` defined with fields: token_mint, from, to, amount
8. All events derive `#[event]` macro for automatic serialization
9. Events logged to transaction logs and parseable by indexer
10. Error codes start at 6000 per Anchor convention

**Status:** ✅ Complete

---

### Story 2.10: Comprehensive Test Suite

**As a** QA engineer,  
**I want** a complete test suite covering all instructions in both success and failure scenarios,  
**so that** the smart contract is proven to work correctly before deployment.

#### Acceptance Criteria

1. Test file `tests/gated-token.ts` created with Mocha/Chai framework
2. **Test 1**: Initialize token with metadata → Verify TokenConfig account created with correct data
3. **Test 2**: Approve wallet → Mint tokens → Verify balance matches amount
4. **Test 3**: Transfer between two approved wallets → SUCCESS (both balances updated correctly)
5. **Test 4**: Transfer to non-approved wallet → FAIL (`RecipientNotApproved` error)
6. **Test 5**: Transfer from non-approved wallet → FAIL (`SenderNotApproved` error)
7. **Test 6**: Revoke approval → Attempt transfer → FAIL (wallet blocked)
8. **Test 7**: Unauthorized admin action (non-authority attempts to mint) → FAIL (`UnauthorizedAuthority`)
9. **Test 8**: Export cap table by fetching all token accounts and aggregating balances
10. All tests pass with `anchor test` command
11. Gas costs logged for each instruction
12. Test coverage includes edge cases (zero amount, overflow, missing accounts)

**Status:** ✅ Complete

---

### Story 2.11: Devnet Deployment & Verification

**As a** blockchain developer,  
**I want** the program deployed to Solana devnet with verified deployment,  
**so that** the backend and frontend can interact with the live contract.

#### Acceptance Criteria

1. Program built successfully with `anchor build`
2. Program deployed to devnet with `anchor deploy --provider.cluster devnet`
3. Deployment transaction signature logged and verified on Solana Explorer
4. Program ID retrieved with `solana address -k target/deploy/gated_token-keypair.json`
5. Program ID updated in `Anchor.toml` under `[programs.devnet]`
6. Program ID updated in `lib.rs` via `declare_id!` macro
7. Program rebuilt after ID update to ensure consistency
8. Program ID added to backend `.env` file as `GATED_TOKEN_PROGRAM_ID`
9. Program ID added to frontend `.env` file for client integration
10. Deployment verified by calling `initialize_token` instruction from CLI or test script
11. Program upgradeable by authority (default Anchor configuration)
12. Documentation updated with deployed program ID

**Status:** ✅ Complete

---

## Summary of Deliverables

### Smart Contract (Rust + Anchor)
- ✅ 2 Account structures (TokenConfig, AllowlistEntry) with PDA derivation
- ✅ 5 Instructions (initialize_token, approve_wallet, revoke_wallet, mint_tokens, gated_transfer)
- ✅ 9 Custom error codes
- ✅ 5 Event definitions with structured data
- ✅ Complete input validation (symbol, name, decimals, amount, authority)
- ✅ Gas-optimized implementations (all under 100k compute units)

### Testing
- ✅ 8 comprehensive test scenarios (success and failure cases)
- ✅ Mocha/Chai test framework configured
- ✅ All tests passing with `anchor test`
- ✅ Gas benchmarks logged for each instruction
- ✅ Edge case coverage (zero amounts, unauthorized calls, missing approvals)

### Deployment
- ✅ Program deployed to Solana devnet
- ✅ Program ID documented and configured across codebase
- ✅ Verified on Solana Explorer
- ✅ Ready for backend integration

### Documentation
- ✅ Program README (`contracts/gated-token/README.md`)
- ✅ Smart contracts reference (`@docs/smart-contracts.md`) - 566 lines covering all instructions, events, errors, gas costs
- ✅ Deployment guide in documentation

---

## Key Technical Decisions

1. **PDA Architecture**: Used Program Derived Addresses for all accounts (TokenConfig, AllowlistEntry) for deterministic discovery and enhanced security
2. **Dual Validation**: Both sender AND recipient must be on allowlist for transfers (core compliance mechanism)
3. **Mutable Metadata**: TokenConfig stores symbol/name on-chain (enables future symbol change instruction without redeployment)
4. **Event-Driven**: All state changes emit events for off-chain indexing and real-time updates
5. **Authority-Based**: Single authority controls all admin operations (simple but centralized - documented as limitation)
6. **SPL Token Standard**: Built on top of SPL Token program for compatibility with wallets and explorers
7. **Anchor Framework**: Leveraged Anchor's high-level abstractions for account management and serialization
8. **Timestamp Tracking**: Stored approval/revocation timestamps for audit trails
9. **Overflow Protection**: Used checked arithmetic for supply tracking to prevent vulnerabilities
10. **Gas Optimization**: Kept all instructions under 100k compute units (well within Solana limits)

---

## Gas Benchmarks

| Instruction | Compute Units | Target | Status |
|-------------|---------------|--------|--------|
| initialize_token | ~85,000 | <100k | ✅ Pass |
| approve_wallet | ~35,000 | <50k | ✅ Pass |
| revoke_wallet | ~20,000 | <50k | ✅ Pass |
| mint_tokens | ~75,000 | <100k | ✅ Pass |
| gated_transfer | ~85,000 | <100k | ✅ Pass |

All instructions meet performance targets with comfortable margin for future enhancements.

---

**Epic 2 Status: ✅ COMPLETE**

The gated token smart contract is fully implemented, tested, and deployed. The program enforces compliance rules on-chain and provides a solid foundation for the tokenized securities platform.
