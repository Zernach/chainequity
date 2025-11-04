# Corporate Actions Guide

## Overview

ChainEquity supports two types of corporate actions as required by the project specification:

1. **Stock Split (7-for-1)** - Multiply all token balances by a ratio
2. **Symbol Change** - Update token ticker and name

This document explains the implementation approaches, tradeoffs, and operational procedures for each.

---

## 1. Stock Split (N-for-1)

### Problem Statement

Traditional companies execute stock splits to:
- Increase liquidity by reducing per-share price
- Make shares more accessible to retail investors
- Signal confidence in company performance

**Example**: A 7-for-1 split converts 1 share → 7 shares, with proportional price adjustment.

**Challenge**: On-chain tokens have immutable supply at the mint level. How do we multiply all balances?

### Implementation Approach: Deploy New Token + Migration

**Chosen Strategy**: Create a new token mint with multiplied metadata supply and migrate all holders.

```
Old Token (ACME)          Stock Split           New Token (ACME-New)
─────────────────         ───────────          ────────────────────
Mint: old_mint_xyz        Ratio: 7             Mint: new_mint_abc
Total Supply: 10,000                           Total Supply: 70,000

Holders:                                       Migrated Holders:
  Alice: 5,000 (50%)      ─────────>          Alice: 35,000 (50%)
  Bob:   3,000 (30%)      ─────────>          Bob:   21,000 (30%)
  Carol: 2,000 (20%)      ─────────>          Carol: 14,000 (20%)
```

### Process Flow

#### Step 1: Preparation
```typescript
// 1. Get all current holders from database
const { data: holders } = await supabase
    .from('token_balances')
    .select('wallet_address, balance')
    .eq('security_id', oldSecurityId)
    .gt('balance', 0);

// 2. Notify holders (off-chain)
await notifyHolders(holders, {
    action: 'stock_split',
    ratio: 7,
    deadline: '2024-12-31',
});
```

#### Step 2: Execute Split On-Chain
```typescript
// 3. Call execute_stock_split instruction
const newMint = Keypair.generate();
await program.methods
    .executeStockSplit(
        new BN(7),              // split_ratio
        'ACME',                 // new_symbol
        'ACME Security Token (Split)'  // new_name
    )
    .accounts({
        authority: adminKeypair.publicKey,
        oldTokenConfig,
        newMint: newMint.publicKey,
        newTokenConfig,
        splitConfig,
        // ...
    })
    .signers([newMint])
    .rpc();
```

**What Happens**:
- New mint created with same decimals
- New TokenConfig PDA initialized
- SplitConfig PDA created to track the split
- `StockSplitExecutedEvent` emitted

#### Step 3: Migrate Holders
```typescript
// 4. For each holder, call migrate_holder_split
for (const holder of holders) {
    await program.methods
        .migrateHolderSplit(new BN(holder.balance))
        .accounts({
            authority: adminKeypair.publicKey,
            holder: new PublicKey(holder.wallet_address),
            splitConfig,
            newMint: newMint.publicKey,
            newTokenConfig,
            holderNewTokenAccount,
            // ...
        })
        .rpc();
}
```

**What Happens**:
- For each holder: `new_balance = old_balance × split_ratio`
- Tokens minted to holder's new token account
- `HolderMigratedEvent` emitted per holder

#### Step 4: Update Database
```typescript
// 5. Mark old security as inactive
await supabase
    .from('securities')
    .update({ 
        is_active: false, 
        replaced_by: newMint.publicKey.toString() 
    })
    .eq('mint_address', oldMint);

// 6. Copy allowlist to new token
await copyAllowlistToNewToken(oldSecurityId, newSecurityId);

// 7. Update frontend to point to new mint
```

### Tradeoffs

#### ✅ Advantages
- **Clean State**: New token starts fresh, no legacy baggage
- **Explicit**: Clear on-chain record of split via SplitConfig
- **Provable**: Split ratio and migration verifiable on-chain
- **Flexible**: Can change symbol/name during split
- **Auditable**: Full history of old token remains immutable

#### ❌ Disadvantages
- **Gas Intensive**: O(n) cost where n = number of holders
  - **Example**: 1,000 holders × ~80k CU = 80M compute units
  - **Cost Estimate**: ~0.01 SOL per holder on Solana (devnet)
- **Migration Complexity**: Requires coordination with holders
- **Two Tokens Exist**: Old token still exists (marked inactive)
- **Manual Process**: Admin must manually migrate each holder
- **Frontend Updates**: Wallets/explorers must update to new mint
- **Risk of Error**: If migration incomplete, some holders stuck on old token

### Alternative Approaches Considered

#### Option B: Virtual Split (Multiplier Display)
Keep balances unchanged, multiply display values by split ratio.

**Pros**: Zero gas cost, instant
**Cons**: 
- Breaks composability with other programs
- Requires all UIs to implement multiplier
- No standard for this pattern
- Confusing for users

**Verdict**: ❌ Not chosen - breaks token fungibility

#### Option C: In-Place Balance Multiplication
Iterate through all holders and update balances in-place.

**Pros**: Single token, no migration
**Cons**:
- Still O(n) gas cost
- More complex rollback if error
- Requires mutable balance accounts (not standard SPL)
- SPL Token program doesn't support this natively

**Verdict**: ❌ Not chosen - requires custom token program

### Recommended Best Practices

1. **Notify Early**: Give holders 30+ days notice
2. **Test on Devnet**: Dry run with test wallets
3. **Batch Migration**: Process holders in batches of 10-20 to manage gas
4. **Monitor Progress**: Track migration completion percentage
5. **Provide Support**: Help desk for holders with issues
6. **Update Documentation**: Point all docs to new mint address
7. **Archive Old Token**: Keep old token data for historical reference

---

## 2. Symbol/Ticker Change

### Problem Statement

Companies may rebrand or change tickers for various reasons:
- Merger/acquisition
- Company rebrand
- Resolving ticker conflicts
- Better SEO/discoverability

**Example**: Change symbol from "ACME" to "ACMEX"

### Implementation Approach: Mutable Metadata

**Chosen Strategy**: Update the symbol and name fields in the TokenConfig PDA.

```
Before                    Symbol Change         After
──────                    ─────────────        ───────
TokenConfig {             Update Metadata      TokenConfig {
  mint: xyz_mint            ─────────>          mint: xyz_mint
  symbol: "ACME"                                symbol: "ACMEX"
  name: "ACME Token"                            name: "ACMEX Token"
  authority: admin                              authority: admin
  ...                                           ...
}                                              }

All balances remain unchanged
```

### Process Flow

```typescript
// 1. Call update_token_metadata instruction
await program.methods
    .updateTokenMetadata(
        'ACMEX',                    // new_symbol
        'ACMEX Security Token'       // new_name
    )
    .accounts({
        authority: adminKeypair.publicKey,
        tokenConfig,
    })
    .rpc();

// 2. Update database
await supabase
    .from('securities')
    .update({ symbol: 'ACMEX', name: 'ACMEX Security Token' })
    .eq('mint_address', tokenMint);

// 3. Record corporate action
await supabase.from('corporate_actions').insert({
    security_id: securityId,
    action_type: 'symbol_change',
    parameters: { old_symbol: 'ACME', new_symbol: 'ACMEX' },
    executed_by: adminKeypair.publicKey.toString(),
    transaction_signature: tx,
});
```

### Tradeoffs

#### ✅ Advantages
- **Instant**: Takes effect immediately in single transaction
- **Low Cost**: ~25,000 compute units (~$0.000025 on mainnet)
- **No Migration**: All balances remain unchanged
- **Same Token**: Mint address stays the same
- **No Coordination**: Holders don't need to do anything
- **Simple**: Single instruction, minimal complexity

#### ❌ Disadvantages
- **Mutable Metadata**: Some argue metadata should be immutable
- **UI Lag**: Wallets/explorers may cache old symbol
- **History Lost**: Old symbol not preserved on-chain (only in events)
- **Composability**: Other programs may hardcode old symbol
- **Indexer Delay**: Off-chain indexers need to update

### Alternative Approaches Considered

#### Option B: Metaplex Token Metadata
Use the Metaplex Token Metadata standard for rich metadata.

**Pros**: Industry standard, rich metadata support, immutable history
**Cons**: 
- Additional program dependency
- More complex integration
- Higher gas costs
- Overkill for simple ticker change

**Verdict**: ✅ Could be added for production, but mutable TokenConfig simpler for prototype

#### Option C: Deploy New Token (Same as Stock Split)
Create new token with new symbol, migrate holders.

**Pros**: Clean history, immutable old token
**Cons**: 
- O(n) gas cost
- Migration complexity
- Overkill for simple name change

**Verdict**: ❌ Not chosen - too expensive for simple metadata change

### Recommended Best Practices

1. **Announce Change**: Public announcement before execution
2. **Update All Systems**: Notify exchanges, wallets, explorers
3. **Preserve History**: Record old symbol in corporate actions table
4. **Monitor Indexers**: Ensure off-chain data updated
5. **Test First**: Verify on devnet before mainnet
6. **Document Reason**: Record rationale for the change

---

## Comparison Matrix

| Feature | Stock Split | Symbol Change |
|---------|-------------|---------------|
| **Complexity** | High | Low |
| **Gas Cost** | O(n) × 80k CU | ~25k CU |
| **Time to Execute** | Minutes to hours | Seconds |
| **Balances Changed** | Yes (all × ratio) | No |
| **Mint Address** | New | Same |
| **Holder Action Required** | Optional* | None |
| **Risk Level** | Medium-High | Low |
| **Rollback Difficulty** | Hard | Easy |
| **Use Case** | Liquidity, accessibility | Branding, clarity |

*With automatic migration, holders don't need to act, but if manual migration required, they must interact.

---

## Corporate Action Workflow

### 1. Proposal
```
Admin proposes corporate action
  ↓
Review by legal/compliance team
  ↓
Board approval (if required)
  ↓
Shareholder notification
```

### 2. Preparation
```
Test on devnet with same holder count
  ↓
Calculate gas costs and timing
  ↓
Prepare holder communication
  ↓
Schedule maintenance window (if needed)
```

### 3. Execution
```
Execute on-chain transaction(s)
  ↓
Migrate holders (stock split only)
  ↓
Update database records
  ↓
Verify completion
```

### 4. Post-Execution
```
Notify holders of completion
  ↓
Update frontend/documentation
  ↓
Monitor for issues
  ↓
Provide support as needed
```

---

## Gas Cost Estimation

### Stock Split (7-for-1)

**Formula**: `total_cost = split_tx + (holders × migration_tx)`

**Example (100 holders)**:
```
Split transaction:     ~120,000 CU   (~$0.00012)
Migration (100×):   100 × 80,000 CU   (~$0.008)
─────────────────────────────────────────────────
Total:                 8,120,000 CU   (~$0.00812)
```

**Scaling**:
- 10 holders: ~$0.0009
- 100 holders: ~$0.008
- 1,000 holders: ~$0.08
- 10,000 holders: ~$0.8

### Symbol Change

**Fixed Cost**: ~25,000 CU (~$0.000025)

**Independent of holder count** ✅

---

## Testing Checklist

### Stock Split
- [ ] Initialize test token on devnet
- [ ] Create 3+ test holders with different balances
- [ ] Execute stock split with ratio 7
- [ ] Verify new mint created
- [ ] Migrate all holders
- [ ] Verify new balances = old balances × 7
- [ ] Verify total supply updated
- [ ] Verify allowlist copied to new token
- [ ] Verify old token marked inactive
- [ ] Export cap table showing new balances

### Symbol Change
- [ ] Initialize test token on devnet
- [ ] Record original symbol/name
- [ ] Execute symbol change
- [ ] Verify TokenConfig updated on-chain
- [ ] Verify database updated
- [ ] Verify all balances unchanged
- [ ] Verify mint address unchanged
- [ ] Verify SymbolChangedEvent emitted

---

## Troubleshooting

### Stock Split Issues

**Problem**: Migration fails for some holders
**Solution**: Re-run migration for failed holders, check allowlist status

**Problem**: Out of gas during bulk migration
**Solution**: Batch migrations into smaller groups (10-20 per transaction)

**Problem**: Holder balance mismatch after split
**Solution**: Check `HolderMigratedEvent` logs, verify split ratio applied correctly

### Symbol Change Issues

**Problem**: Old symbol still showing in wallet
**Solution**: Wait for wallet to refresh metadata cache (varies by wallet)

**Problem**: Explorer shows old symbol
**Solution**: Contact explorer support to refresh metadata

**Problem**: Event not emitted
**Solution**: Verify transaction succeeded, check program logs

---

## Regulatory Considerations

⚠️ **Important**: Corporate actions for real securities require:

1. **Regulatory Approval**: SEC, FINRA, or equivalent in your jurisdiction
2. **Shareholder Vote**: May be required for some actions
3. **Notice Period**: Typically 30+ days advance notice
4. **Exchange Approval**: If listed on any exchange
5. **Record Date**: Establish who is eligible for the action
6. **Documentation**: Board resolutions, legal opinions
7. **Disclosure**: Public filing requirements (Form 8-K, etc.)

This implementation is a **technical prototype only** and does NOT provide any compliance mechanisms.

---

## Summary

| Aspect | Recommendation |
|--------|---------------|
| **Stock Split** | Use deploy new token + migration for accuracy and provability |
| **Symbol Change** | Use mutable metadata for simplicity and low cost |
| **Production** | Add Metaplex metadata standard for rich data and industry compatibility |
| **Governance** | Implement multi-sig or DAO governance for admin actions |
| **Testing** | Always dry run on devnet with realistic holder counts |
| **Compliance** | Consult legal counsel before executing any corporate action |

Both approaches are implemented and functional. Choose based on your specific requirements, holder count, and gas budget.

