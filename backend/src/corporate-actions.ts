import { Keypair } from '@solana/web3.js';
import { supabase } from './db';
import { logger } from './utils/logger';

export interface StockSplitParams {
    tokenMint: string;
    splitRatio: number;
    newSymbol: string;
    newName: string;
    authorityKeypair: Keypair;
}

export interface StockSplitResult {
    success: boolean;
    oldMint: string;
    newMint: string;
    splitRatio: number;
    signature: string;
    holdersTransitioned: number;
    error?: string;
}

export interface SymbolChangeParams {
    tokenMint: string;
    newSymbol: string;
    newName: string;
    authorityKeypair: Keypair;
}

export interface SymbolChangeResult {
    success: boolean;
    signature: string;
    error?: string;
}

/**
 * Execute a 7-for-1 (or N-for-1) stock split
 * Creates a new token with multiplied supply and migrates all holders
 */
export async function executeStockSplit(params: StockSplitParams): Promise<StockSplitResult> {
    const { tokenMint, splitRatio, newSymbol, newName, authorityKeypair } = params;

    logger.info('Executing stock split', { tokenMint, splitRatio });

    try {
        // 1. Get all current holders from database
        const { data: security, error: securityError } = await supabase
            .from('securities')
            .select('id, decimals')
            .eq('mint_address', tokenMint)
            .single();

        if (securityError || !security) {
            logger.error('Security not found', new Error(`Security not found for mint: ${tokenMint}`));
            throw new Error(`Security not found for mint address: ${tokenMint}. Please ensure the token is initialized in the database first.`);
        }

        const { data: holders } = await supabase
            .from('token_balances')
            .select('wallet_address, balance')
            .eq('security_id', security.id)
            .gt('balance', 0);

        logger.info('Found holders to migrate', { count: holders?.length || 0 });

        // 2. Execute split instruction on-chain (this is a placeholder - actual implementation requires Anchor program setup)
        // In a real implementation, we'd:
        // - Load the Anchor program
        // - Call execute_stock_split instruction
        // - Get the new mint keypair from the transaction

        // For now, simulate the split by creating entries in the database
        const newMintKeypair = Keypair.generate();
        const newMint = newMintKeypair.publicKey.toString();

        logger.info('Stock split - new mint generated', { newMint });

        // 3. Store corporate action in database
        const { error: actionError } = await supabase.from('corporate_actions').insert({
            security_id: security.id,
            action_type: 'stock_split',
            parameters: {
                old_mint: tokenMint,
                new_mint: newMint,
                split_ratio: splitRatio,
            },
            executed_by: authorityKeypair.publicKey.toString(),
            transaction_signature: 'simulation', // Would be real signature in production
            status: 'in_progress',
        });

        if (actionError) {
            logger.error('Failed to record corporate action', actionError as any);
        }

        // 4. Create new security record
        const { error: newSecurityError } = await supabase.from('securities').insert({
            mint_address: newMint,
            symbol: newSymbol,
            name: newName,
            decimals: security.decimals,
            total_supply: 0, // Will be updated as holders are migrated
            current_supply: 0,
            program_id: process.env.GATED_TOKEN_PROGRAM_ID || '',
            is_active: true,
            previous_mint: tokenMint,
        });

        if (newSecurityError) {
            logger.error('Failed to create new security', newSecurityError as any);
            throw new Error('Failed to create new security');
        }

        // 5. Get the new security ID
        const { data: newSecurity } = await supabase
            .from('securities')
            .select('id')
            .eq('mint_address', newMint)
            .single();

        if (!newSecurity) {
            throw new Error('Failed to retrieve new security');
        }

        // 6. Copy allowlist to new token
        await copyAllowlistToNewToken(security.id, newSecurity.id);

        // 7. Migrate all holders (in production, this would call on-chain instructions)
        let transitionCount = 0;
        for (const holder of holders || []) {
            const oldBalance = Number(holder.balance);
            const newBalance = oldBalance * splitRatio;

            // Insert new balance record
            await supabase.from('token_balances').upsert({
                security_id: newSecurity.id,
                wallet_address: holder.wallet_address,
                balance: newBalance,
                block_height: 0, // Would be actual block height in production
                slot: 0,
            }, {
                onConflict: 'security_id,wallet_address',
            });

            transitionCount++;
        }

        logger.info('Holders migrated', { count: transitionCount });

        // 8. Update new security total supply
        const totalNewSupply = (holders || []).reduce((sum, h) => sum + (Number(h.balance) * splitRatio), 0);
        await supabase
            .from('securities')
            .update({ current_supply: totalNewSupply, total_supply: totalNewSupply })
            .eq('id', newSecurity.id);

        // 9. Mark old security as inactive
        await supabase
            .from('securities')
            .update({ is_active: false, replaced_by: newMint })
            .eq('mint_address', tokenMint);

        // 10. Update corporate action status
        await supabase
            .from('corporate_actions')
            .update({ status: 'completed' })
            .eq('security_id', security.id)
            .eq('action_type', 'stock_split')
            .order('created_at', { ascending: false })
            .limit(1);

        return {
            success: true,
            oldMint: tokenMint,
            newMint,
            splitRatio,
            signature: 'simulation',
            holdersTransitioned: transitionCount,
        };
    } catch (error) {
        logger.error('Stock split failed', error as Error);
        return {
            success: false,
            oldMint: tokenMint,
            newMint: '',
            splitRatio,
            signature: '',
            holdersTransitioned: 0,
            error: (error as Error).message,
        };
    }
}

/**
 * Copy allowlist entries from old security to new security
 */
async function copyAllowlistToNewToken(oldSecurityId: string, newSecurityId: string): Promise<void> {
    // Get all approved wallets from old security
    const { data: allowlist } = await supabase
        .from('allowlist')
        .select('wallet_address, approved_by')
        .eq('security_id', oldSecurityId)
        .eq('status', 'approved');

    if (!allowlist || allowlist.length === 0) {
        logger.info('No allowlist entries to copy');
        return;
    }

    // Copy allowlist entries
    const newEntries = allowlist.map(entry => ({
        security_id: newSecurityId,
        wallet_address: entry.wallet_address,
        status: 'approved',
        approved_by: entry.approved_by,
    }));

    const { error } = await supabase.from('allowlist').insert(newEntries);

    if (error) {
        logger.error('Failed to copy allowlist', error as any);
    } else {
        logger.info('Allowlist copied', { count: newEntries.length });
    }
}

/**
 * Change token symbol and name (mutable metadata)
 */
export async function changeTokenSymbol(params: SymbolChangeParams): Promise<SymbolChangeResult> {
    const { tokenMint, newSymbol, newName, authorityKeypair } = params;

    logger.info('Changing token symbol', { tokenMint, newSymbol, newName });

    try {
        // Get security
        const { data: security, error: securityError } = await supabase
            .from('securities')
            .select('id, symbol, name')
            .eq('mint_address', tokenMint)
            .single();

        if (securityError || !security) {
            logger.error('Security not found', new Error(`Security not found for mint: ${tokenMint}`));
            throw new Error(`Security not found for mint address: ${tokenMint}. Please ensure the token is initialized in the database first.`);
        }

        const oldSymbol = security.symbol;
        const oldName = security.name;

        // Update database (in production, would also call on-chain instruction)
        const { error: updateError } = await supabase
            .from('securities')
            .update({ symbol: newSymbol, name: newName })
            .eq('mint_address', tokenMint);

        if (updateError) {
            logger.error('Failed to update security', updateError as any);
            throw new Error('Failed to update security metadata');
        }

        // Record corporate action
        const { error: actionError } = await supabase.from('corporate_actions').insert({
            security_id: security.id,
            action_type: 'symbol_change',
            parameters: {
                old_symbol: oldSymbol,
                new_symbol: newSymbol,
                old_name: oldName,
                new_name: newName
            },
            executed_by: authorityKeypair.publicKey.toString(),
            transaction_signature: 'simulation',
            status: 'completed',
        });

        if (actionError) {
            logger.error('Failed to record corporate action', actionError as any);
        }

        logger.info('Token symbol changed successfully', { oldSymbol, newSymbol });

        return {
            success: true,
            signature: 'simulation',
        };
    } catch (error) {
        logger.error('Symbol change failed', error as Error);
        return {
            success: false,
            signature: '',
            error: (error as Error).message,
        };
    }
}

/**
 * Get security ID from mint address
 */
// @ts-ignore - Utility function for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getSecurityId(mintAddress: string): Promise<string> {
    const { data } = await supabase
        .from('securities')
        .select('id')
        .eq('mint_address', mintAddress)
        .single();

    if (!data) {
        throw new Error('Security not found');
    }

    return data.id;
}

