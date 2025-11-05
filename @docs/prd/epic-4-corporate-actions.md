# Epic 4: Corporate Actions System

**Status:** 🚧 IN PROGRESS  
**Goal:** Implement stock split (7-for-1) and symbol/ticker change functionality. Enable admins to execute corporate actions via the UI with proper migration workflows and audit trails.

---

## Epic Goal (Expanded)

This epic delivers two critical corporate action mechanisms required for managing tokenized securities: stock splits and symbol/name changes. Stock splits multiply token supply and holder balances while maintaining proportional ownership (e.g., 7-for-1 means each holder's balance multiplies by 7). Symbol changes update token metadata without affecting balances. Both actions require careful implementation to ensure data consistency, complete audit trails, and proper migration workflows. The smart contract, backend orchestration, and admin UI must work together seamlessly.

---

## Stories

### Story 4.1: Split Config PDA & Account Structure

**As a** blockchain developer,  
**I want** a SplitConfig account structure that records stock split parameters,  
**so that** the system tracks which tokens are related by splits and prevents duplicate operations.

#### Acceptance Criteria

1. `SplitConfig` struct defined in `contracts/gated-token/programs/gated-token/src/lib.rs` with fields: original_mint (Pubkey), new_mint (Pubkey), split_ratio (u64), executed_at (i64), executed_by (Pubkey), bump (u8)
2. Struct derives required traits: `#[account]`, `AnchorSerialize`, `AnchorDeserialize`
3. Space calculated correctly: `8 + 32 + 32 + 8 + 8 + 32 + 1 = 121 bytes`
4. PDA seeds defined: `["split_config", old_mint, new_mint]`
5. SplitConfig created during `execute_stock_split` instruction
6. SplitConfig can be queried to verify split relationship between tokens
7. Split ratio stored as multiplier (e.g., 7 for 7-for-1 split)
8. Timestamps track when split was executed
9. Executed_by field records admin authority who performed split
10. Documentation updated in smart-contracts.md with SplitConfig structure

**Dependencies:** None (extends existing smart contract)

---

### Story 4.2: Execute Stock Split Instruction (Smart Contract)

**As an** admin,  
**I want** a smart contract instruction that creates a new token with multiplied supply for stock splits,  
**so that** I can execute N-for-1 splits while maintaining a clear audit trail.

#### Acceptance Criteria

1. `execute_stock_split` instruction defined with parameters: `split_ratio: u64`, `new_symbol: String`, `new_name: String`
2. Accounts required: authority (signer, mut), old_token_config (PDA), new_mint (init), new_token_config (init, PDA), split_config (init, PDA), token_program, system_program, rent
3. Authority validation: must match old_token_config.authority
4. Split ratio validation: must be > 0 (throws `InvalidSplitRatio` error)
5. New token symbol/name validation using existing validators
6. New mint initialized with same decimals as original token
7. New TokenConfig created with authority, symbol, name, decimals
8. New TokenConfig.total_supply = old_token_config.total_supply * split_ratio
9. SplitConfig created linking original_mint to new_mint with split_ratio
10. Event `StockSplitExecutedEvent` emitted with: old_mint, new_mint, split_ratio, authority, timestamp
11. Old token remains active (can be marked inactive later via separate operation)
12. Instruction callable by authority only
13. Gas cost benchmarked (target: reasonable for one-time operation, may exceed 100k)
14. Unit test verifies: TokenConfig created with multiplied supply, SplitConfig stores relationship, event emitted

**Dependencies:** Story 4.1 (SplitConfig structure)

---

### Story 4.3: Migrate Holder Balance Instruction

**As an** admin,  
**I want** an instruction to migrate a single holder's balance to the new split token,  
**so that** I can migrate all holders one-by-one after executing a split.

#### Acceptance Criteria

1. `migrate_holder_split` instruction defined with parameter: `old_balance: u64`
2. Accounts required: authority (signer, mut), holder, split_config (PDA), new_mint (mut), new_token_config (mut, PDA), holder_new_token_account (mut), token_program
3. Authority validation: must match new_token_config.authority
4. Split_config validated: original_mint and new_mint match expected tokens
5. New balance calculated: `new_balance = old_balance * split_config.split_ratio`
6. Tokens minted to holder's new token account using `mint_to` CPI
7. New_token_config.total_supply verified/updated if needed (defensive check)
8. Event `HolderMigratedEvent` emitted with: wallet, old_balance, new_balance, split_ratio
9. Overflow protection: multiplication checked to prevent u64 overflow
10. Instruction callable multiple times (once per holder)
11. Instruction idempotent: if holder already has balance in new token, addition is safe
12. Gas cost < 100k compute units (must be efficient for many calls)
13. Unit test verifies: balance calculated correctly, tokens minted, supply updated, event emitted

**Dependencies:** Story 4.2 (execute_stock_split instruction)

---

### Story 4.4: Backend Stock Split Orchestration

**As a** backend developer,  
**I want** a backend service that orchestrates the complete stock split workflow,  
**so that** the admin doesn't have to manually migrate each holder.

#### Acceptance Criteria

1. File `backend/src/corporate-actions.ts` created with stock split orchestration functions
2. Function `executStockSplit(oldMintAddress, splitRatio, newSymbol, newName)` orchestrates the flow
3. Step 1: Call smart contract `execute_stock_split` instruction
4. Step 2: Query all holders from token_balances table for old token
5. Step 3: For each holder, call `migrate_holder_split` instruction with their balance
6. Step 4: Progress tracked: holders migrated count, total holders, percentage complete
7. Step 5: Copy allowlist: query old token allowlist, approve same wallets on new token
8. Step 6: Store corporate action record in database with status tracking
9. Database record in `corporate_actions` table: id, security_id, action_type ('stock_split'), parameters (JSONB: split_ratio, old_mint, new_mint), executed_by, executed_at, status ('in_progress'|'completed'|'failed')
10. Progress updates broadcast via WebSocket: `{ type: 'corporate_action_progress', data: { action_id, holders_migrated, total_holders, status } }`
11. Error handling: if migration fails for one holder, log error but continue with others
12. On completion: update corporate action status to 'completed', broadcast completion event
13. Rollback strategy documented (what happens if split partially fails)
14. TypeScript interfaces defined in `backend/src/types/corporate-actions.types.ts`

**Dependencies:** Story 4.2, Story 4.3 (smart contract instructions), Story 3.x (database schema with corporate_actions table)

---

### Story 4.5: Allowlist Migration for Stock Splits

**As a** backend developer,  
**I want** the split orchestration to automatically copy the allowlist from old token to new token,  
**so that** all previously approved wallets can immediately trade the new token.

#### Acceptance Criteria

1. Function `migrateAllowlist(oldMintAddress, newMintAddress)` in corporate-actions.ts
2. Query allowlist entries for old token from database where status='approved'
3. For each approved wallet, call smart contract `approve_wallet` instruction on new token
4. Approval timestamp preserved or new timestamp recorded (document decision)
5. Progress logged: "Migrated allowlist entry X of Y"
6. Batch processing: approve multiple wallets in parallel (configurable batch size, default 10)
7. Error handling: if approval fails for one wallet, log error and continue
8. Database updated: allowlist entries created for new token in database
9. WebSocket broadcast: allowlist updates for new token
10. Function callable independently (useful for testing or manual migration)
11. Migration tracked in corporate action record: `allowlist_migrated: true/false`
12. Documentation: explains why allowlist migration is necessary (compliance continuity)

**Dependencies:** Story 4.4 (orchestration function calls this)

---

### Story 4.6: Update Token Metadata Instruction (Symbol Change)

**As an** admin,  
**I want** a smart contract instruction to change token symbol and name,  
**so that** I can rebrand or correct token metadata without redeployment.

#### Acceptance Criteria

1. `update_token_metadata` instruction defined with parameters: `new_symbol: String`, `new_name: String`
2. Accounts required: authority (signer, mut), token_config (mut, PDA)
3. Authority validation: must match token_config.authority
4. Symbol validation: 3-10 characters, alphanumeric (same rules as initialize)
5. Name validation: 2-50 characters (same rules as initialize)
6. Store old values: `old_symbol = token_config.symbol.clone()`, `old_name = token_config.name.clone()`
7. Update TokenConfig: `token_config.symbol = new_symbol`, `token_config.name = new_name`
8. Event `SymbolChangedEvent` emitted with: mint, old_symbol, new_symbol, old_name, new_name, authority, timestamp
9. All balances remain unchanged (no token migration needed)
10. Total_supply unchanged, decimals unchanged
11. Gas cost < 50k compute units (simple metadata update)
12. Unit test verifies: symbol updated, name updated, balances unchanged, event emitted
13. Error: `InvalidSymbol` or `InvalidName` thrown for invalid inputs

**Dependencies:** None (independent instruction)

---

### Story 4.7: Backend Symbol Change Handler

**As a** backend developer,  
**I want** a backend handler that processes symbol change requests and updates the database,  
**so that** the frontend can trigger symbol changes via API.

#### Acceptance Criteria

1. Function `changeTokenSymbol(mintAddress, newSymbol, newName)` in corporate-actions.ts
2. Validation: check that security exists in database
3. Call smart contract `update_token_metadata` instruction
4. Wait for transaction confirmation
5. Update securities table: symbol = newSymbol, name = newName
6. Insert corporate action record: action_type='symbol_change', parameters={old_symbol, new_symbol, old_name, new_name}
7. Broadcast update via WebSocket: `{ type: 'symbol_changed', data: { mint, old_symbol, new_symbol, old_name, new_name } }`
8. Response includes transaction signature for verification
9. Error handling: if smart contract call fails, return error without updating database
10. Logging: log old and new values for audit trail
11. Backend endpoint `POST /admin/corporate-actions/change-symbol` with request body: `{ token_mint, new_symbol, new_name }`
12. Endpoint requires admin authentication and authorization

**Dependencies:** Story 4.6 (smart contract instruction)

---

### Story 4.8: Corporate Actions API Endpoints

**As a** frontend developer,  
**I want** REST API endpoints for executing corporate actions,  
**so that** the admin UI can trigger splits and symbol changes.

#### Acceptance Criteria

1. `POST /admin/corporate-actions/stock-split` - Executes stock split
   - Request body: `{ token_mint, split_ratio, new_symbol, new_name }`
   - Response: `{ success: true, data: { action_id, new_mint, transaction_signature } }`
2. `POST /admin/corporate-actions/change-symbol` - Changes token symbol/name
   - Request body: `{ token_mint, new_symbol, new_name }`
   - Response: `{ success: true, data: { transaction_signature } }`
3. `GET /admin/corporate-actions/:actionId/status` - Checks split progress
   - Response: `{ success: true, data: { action_id, type, status, holders_migrated, total_holders, errors } }`
4. `GET /admin/corporate-actions/:mintAddress/history` - Lists all actions for token
   - Response: `{ success: true, data: [{ id, type, parameters, executed_by, executed_at, status }, ...] }`
5. All endpoints require authentication (JWT token)
6. All endpoints require admin role authorization
7. Error responses include descriptive messages: "Security not found", "Invalid split ratio", "Unauthorized"
8. Endpoints added to `backend/src/handlers/admin.handlers.ts`
9. Routes registered in `backend/src/server.ts` under `/admin/corporate-actions/*`
10. API documentation updated with request/response examples

**Dependencies:** Story 4.4, Story 4.7 (backend functions)

---

### Story 4.9: Corporate Actions Admin Screen (UI)

**As an** admin,  
**I want** a corporate actions screen where I can execute stock splits and change symbols,  
**so that** I can manage these operations through the UI.

#### Acceptance Criteria

1. File `frontend/app/admin/corporate-actions.tsx` created
2. Screen shows two sections: "Execute Stock Split" and "Change Token Symbol"
3. **Stock Split Section:**
   - Security selector dropdown (loads all securities)
   - Split ratio input (numeric, default 7)
   - New symbol input (3-10 chars validation)
   - New name input (2-50 chars validation)
   - "Execute Split" button (requires confirmation modal)
4. **Symbol Change Section:**
   - Security selector dropdown
   - New symbol input
   - New name input
   - "Update Symbol" button (requires confirmation modal)
5. Confirmation modals show exactly what will happen with current and new values
6. Split progress displayed in real-time: "Migrating holders: X / Y (Z%)"
7. Progress updates received via WebSocket and displayed dynamically
8. Success/error modals shown after completion
9. Transaction signatures displayed as clickable links to Solana Explorer
10. Corporate actions history table at bottom showing past actions with filters
11. Loading states for all operations
12. Form validation with helpful error messages
13. Disable buttons during operation to prevent duplicate submissions
14. Screen accessible via admin navigation menu

**Dependencies:** Story 4.8 (API endpoints)

---

### Story 4.10: Corporate Action Event Processing in Indexer

**As a** backend developer,  
**I want** the indexer to process StockSplitExecuted, HolderMigrated, and SymbolChanged events,  
**so that** the database reflects all corporate actions from blockchain events.

#### Acceptance Criteria

1. Extend `backend/src/indexer.ts` with new event processors
2. `processStockSplitExecutedEvent()` method:
   - Parse event: old_mint, new_mint, split_ratio, authority, timestamp
   - Insert corporate action record in database
   - Create new security record for new_mint (if not already exists)
   - Link old and new security with split relationship
3. `processHolderMigratedEvent()` method:
   - Parse event: wallet, old_balance, new_balance, split_ratio
   - Update holder migration progress in corporate action record
   - Log migration for audit trail
4. `processSymbolChangedEvent()` method:
   - Parse event: mint, old_symbol, new_symbol, old_name, new_name, authority, timestamp
   - Update securities table: symbol and name fields
   - Insert corporate action record
5. All event processors broadcast updates via WebSocket
6. Event processors idempotent (handle duplicate events gracefully)
7. Error handling: malformed events logged but don't crash indexer
8. Type definitions updated in indexer.types.ts for new events
9. Indexer documentation updated with new event types

**Dependencies:** Story 4.2, Story 4.3, Story 4.6 (smart contract events)

---

### Story 4.11: Split Relationship Tracking & Queries

**As a** user,  
**I want** to query split relationships between tokens,  
**so that** I can understand token history and lineage.

#### Acceptance Criteria

1. Function `getSplitHistory(mintAddress)` queries corporate_actions table for all splits
2. Response includes: old_mint, new_mint, split_ratio, executed_at for each split
3. Function `getTokenLineage(mintAddress)` returns complete chain: [original_token, split_1, split_2, ...]
4. Token lineage constructed by following split relationships recursively
5. Frontend can display: "This token is a 7-for-1 split of OLDTOKEN executed on DATE"
6. Cap table screen includes lineage information if token is result of split
7. Backend endpoint `GET /securities/:mintAddress/split-history` returns split history
8. Backend endpoint `GET /securities/:mintAddress/lineage` returns full lineage
9. Database query optimized with indexes on corporate_actions table
10. Documentation explains split relationships and how to trace token history

**Dependencies:** Story 4.10 (corporate actions stored in database)

---

### Story 4.12: Corporate Actions Testing & Validation

**As a** QA engineer,  
**I want** comprehensive tests for all corporate action workflows,  
**so that** I can verify splits and symbol changes work correctly.

#### Acceptance Criteria

1. **Smart Contract Tests** (add to `contracts/gated-token/tests/gated-token.ts`):
   - Test execute_stock_split → Verify new token created with multiplied supply
   - Test migrate_holder_split → Verify holder balance multiplied correctly
   - Test update_token_metadata → Verify symbol/name updated, balances unchanged
   - Test unauthorized split/symbol change → Fail with UnauthorizedAuthority
   - Test invalid split ratio (0) → Fail with InvalidSplitRatio
   - Test invalid symbol/name → Fail with validation errors
2. **Backend Integration Tests** (create `backend/tests/corporate-actions.test.ts`):
   - Test executStockSplit() → Verify all holders migrated, allowlist copied
   - Test migrateAllowlist() → Verify all approved wallets transferred to new token
   - Test changeTokenSymbol() → Verify database updated, WebSocket broadcast sent
   - Test error handling: partial failure during holder migration
3. **Manual Test Checklist:**
   - Initialize token (e.g., "ACME" with 1000 supply)
   - Mint tokens to 3 wallets (Alice: 500, Bob: 300, Charlie: 200)
   - Execute 7-for-1 split
   - Verify new token has 7000 supply
   - Verify Alice has 3500, Bob has 2100, Charlie has 1400
   - Verify ownership percentages unchanged (Alice: 50%, Bob: 30%, Charlie: 20%)
   - Verify allowlist copied to new token
   - Change symbol from "ACME" to "ACMEX"
   - Verify balances unchanged
   - Verify symbol displayed as "ACMEX" in UI
4. All tests pass before merging to main branch
5. Gas benchmarks logged for new instructions
6. Test results documented in PROGRESS.md

**Dependencies:** All previous stories in this epic

---

## Summary of Epic 4

### Smart Contract (Rust + Anchor)
- 🔄 1 new account structure (SplitConfig PDA)
- 🔄 3 new instructions (execute_stock_split, migrate_holder_split, update_token_metadata)
- 🔄 3 new events (StockSplitExecutedEvent, HolderMigratedEvent, SymbolChangedEvent)
- 🔄 2 new error codes (InvalidSplitRatio, plus existing validation errors reused)
- 🔄 Gas benchmarks for new instructions

### Backend (TypeScript)
- 🔄 New module: corporate-actions.ts (~300-400 lines)
- 🔄 Orchestration functions: executStockSplit(), migrateAllowlist(), changeTokenSymbol()
- 🔄 4 new API endpoints for corporate actions
- 🔄 Event processor updates in indexer.ts
- 🔄 WebSocket broadcasts for split progress and symbol changes
- 🔄 Type definitions for corporate actions

### Frontend (React Native + Expo)
- 🔄 New screen: admin/corporate-actions.tsx
- 🔄 Split execution UI with progress tracking
- 🔄 Symbol change UI with confirmation
- 🔄 Corporate actions history table
- 🔄 Real-time progress updates via WebSocket

### Database
- 🔄 Corporate actions already in schema (database/002_create_securities_tables.sql) - use existing table
- 🔄 Possible new indexes for performance (on corporate_actions table)

### Testing
- 🔄 Smart contract tests for all 3 new instructions
- 🔄 Backend integration tests for orchestration
- 🔄 Manual test checklist for end-to-end split workflow

---

## Key Technical Decisions

1. **Deploy New Token Approach**: Stock splits create a new token with multiplied supply instead of updating existing token (preserves immutable blockchain history)
2. **Manual Migration**: Holders must be migrated one-by-one via separate transactions (Solana's transaction size limits prevent batch operations)
3. **Backend Orchestration**: Backend coordinates the multi-step split process (smart contract can't do this atomically)
4. **Allowlist Copying**: Allowlist automatically copied from old to new token to maintain compliance continuity
5. **Mutable Metadata**: Token symbol/name stored on-chain in TokenConfig enables updates without new token deployment
6. **Audit Trail**: All corporate actions recorded in database with complete parameters, timestamps, and executor information
7. **Progress Tracking**: Split progress broadcast via WebSocket for real-time UI updates
8. **Partial Failure Handling**: If some holders fail to migrate, split continues and errors are logged (admin can retry failed migrations)
9. **No Automatic Deactivation**: Old token remains active after split (admin must manually communicate to holders to migrate)
10. **Split Verification**: SplitConfig PDA prevents duplicate splits and enables lineage tracking

---

## Acceptance Criteria for Epic Completion

- [ ] All 12 stories completed and tested
- [ ] Smart contract deployed to devnet with new instructions
- [ ] Backend orchestration tested with real split execution
- [ ] Admin UI allows split and symbol change with progress tracking
- [ ] Test suite includes all new instructions and workflows
- [ ] Gas benchmarks documented for new instructions
- [ ] Documentation updated (smart-contracts.md, architecture.md, PROGRESS.md)
- [ ] Demo script includes stock split example
- [ ] No critical bugs or blockers remaining

---

**Epic 4 Status: 🚧 IN PROGRESS**

Corporate actions system is the next major feature to implement. This epic requires coordination across smart contract, backend orchestration, and admin UI layers.
