import { Response } from 'express';
import { Wallet } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { connection } from '../solana';
import { GatedTokenClient, loadAdminKeypair } from '../program-client';
import { executeStockSplit, changeTokenSymbol } from '../corporate-actions';
import { AuthRequest } from '../types/auth.types';
import { supabaseAdmin } from '../db';

/**
 * Initialize new token
 * POST /admin/token/initialize
 */
export async function initializeToken(req: AuthRequest, res: Response) {
    console.log('[AdminHandler] initializeToken called');
    console.log('[AdminHandler] Request body:', req.body);
    console.log('[AdminHandler] Auth user:', req.user);

    try {
        const { symbol, name, decimals } = req.body;
        console.log('[AdminHandler] Extracted params:', { symbol, name, decimals });

        if (!symbol || !name) {
            console.log('[AdminHandler] Validation failed: missing symbol or name');
            return res.status(400).json({
                success: false,
                error: 'Symbol and name are required',
            });
        }

        console.log('[AdminHandler] Loading admin keypair...');
        const adminKeypair = loadAdminKeypair();
        console.log('[AdminHandler] Admin keypair loaded, public key:', adminKeypair.publicKey.toString());

        console.log('[AdminHandler] Creating GatedTokenClient...');
        const client = new GatedTokenClient(connection, new Wallet(adminKeypair));

        console.log('[AdminHandler] Generating new mint keypair...');
        const mint = Keypair.generate();
        console.log('[AdminHandler] Generated mint:', mint.publicKey.toString());

        const params = {
            mint,
            authority: adminKeypair,
            symbol,
            name,
            decimals: decimals || 9,
        };
        console.log('[AdminHandler] Calling client.initializeToken with params:', {
            mint: params.mint.publicKey.toString(),
            authority: params.authority.publicKey.toString(),
            symbol: params.symbol,
            name: params.name,
            decimals: params.decimals,
        });

        const result = await client.initializeToken(params);
        console.log('[AdminHandler] client.initializeToken returned:', result);

        // Store security in database (for simulation mode)
        // In production, this would be handled by the indexer processing on-chain events
        console.log('[AdminHandler] Storing security in database...');
        const { data: security, error: dbError } = await supabaseAdmin
            .from('securities')
            .insert([
                {
                    mint_address: result.mint,
                    symbol,
                    name,
                    decimals: decimals || 9,
                    total_supply: 0,
                    current_supply: 0,
                    program_id: process.env.GATED_TOKEN_PROGRAM_ID || '7zmjGpWX7frSmnFfyZuhhrfoLgV3yH44RJZbKob1FSJF',
                    is_active: true,
                },
            ])
            .select()
            .single();

        if (dbError) {
            console.error('[AdminHandler] Failed to store security in database:', dbError);
            return res.status(500).json({
                success: false,
                error: 'Token initialized on-chain but failed to store in database: ' + dbError.message,
            });
        }

        console.log('[AdminHandler] Security stored in database:', security);

        const response = { success: true, ...result, security };
        console.log('[AdminHandler] Sending success response:', response);
        return res.json(response);
    } catch (error) {
        console.error('[AdminHandler] Token initialization error:', error);
        console.error('[AdminHandler] Error stack:', (error as Error).stack);
        return res.status(500).json({ success: false, error: (error as Error).message });
    }
}

/**
 * Approve wallet on allowlist
 * POST /admin/allowlist/approve
 */
export async function approveWallet(req: AuthRequest, res: Response) {
    try {
        const { token_mint, wallet_address } = req.body;

        if (!token_mint || !wallet_address) {
            return res.status(400).json({
                success: false,
                error: 'token_mint and wallet_address are required',
            });
        }

        // First, get the security ID for this token mint
        const { data: security, error: securityError } = await supabaseAdmin
            .from('securities')
            .select('id')
            .eq('mint_address', token_mint)
            .single();

        if (securityError || !security) {
            console.error('Security not found for mint:', token_mint, securityError);
            return res.status(404).json({
                success: false,
                error: 'Security not found. Please initialize the token first.',
            });
        }

        const adminKeypair = loadAdminKeypair();
        const client = new GatedTokenClient(connection, new Wallet(adminKeypair));

        const result = await client.approveWallet({
            authority: adminKeypair,
            tokenMint: new PublicKey(token_mint),
            walletToApprove: new PublicKey(wallet_address),
        });

        // Store allowlist entry in database (for simulation mode)
        // In production, this would be handled by the indexer processing on-chain events
        const { data: allowlistEntry, error: dbError } = await supabaseAdmin
            .from('allowlist')
            .upsert(
                {
                    security_id: security.id,
                    wallet_address,
                    status: 'approved',
                    approved_by: req.user?.wallet_address || adminKeypair.publicKey.toString(),
                    approved_at: new Date().toISOString(),
                },
                {
                    onConflict: 'security_id,wallet_address',
                }
            )
            .select()
            .single();

        if (dbError) {
            console.error('Failed to store allowlist entry:', dbError);
            return res.status(500).json({
                success: false,
                error: 'Wallet approved on-chain but failed to store in database: ' + dbError.message,
            });
        }

        return res.json({ success: true, ...result, allowlistEntry });
    } catch (error) {
        console.error('Wallet approval error:', error);
        return res.status(500).json({ success: false, error: (error as Error).message });
    }
}

/**
 * Revoke wallet from allowlist
 * POST /admin/allowlist/revoke
 */
export async function revokeWallet(req: AuthRequest, res: Response) {
    try {
        const { token_mint, wallet_address } = req.body;

        if (!token_mint || !wallet_address) {
            return res.status(400).json({
                success: false,
                error: 'token_mint and wallet_address are required',
            });
        }

        // First, get the security ID for this token mint
        const { data: security, error: securityError } = await supabaseAdmin
            .from('securities')
            .select('id')
            .eq('mint_address', token_mint)
            .single();

        if (securityError || !security) {
            console.error('Security not found for mint:', token_mint, securityError);
            return res.status(404).json({
                success: false,
                error: 'Security not found',
            });
        }

        const adminKeypair = loadAdminKeypair();
        const client = new GatedTokenClient(connection, new Wallet(adminKeypair));

        const result = await client.revokeWallet({
            authority: adminKeypair,
            tokenMint: new PublicKey(token_mint),
            walletToRevoke: new PublicKey(wallet_address),
        });

        // Update allowlist entry in database (for simulation mode)
        // In production, this would be handled by the indexer processing on-chain events
        const { error: dbError } = await supabaseAdmin
            .from('allowlist')
            .update({
                status: 'revoked',
                revoked_at: new Date().toISOString(),
            })
            .eq('security_id', security.id)
            .eq('wallet_address', wallet_address);

        if (dbError) {
            console.error('Failed to update allowlist entry:', dbError);
            return res.status(500).json({
                success: false,
                error: 'Wallet revoked on-chain but failed to update database: ' + dbError.message,
            });
        }

        return res.json({ success: true, ...result });
    } catch (error) {
        console.error('Wallet revocation error:', error);
        return res.status(500).json({ success: false, error: (error as Error).message });
    }
}

/**
 * Mint tokens to approved wallet
 * POST /admin/mint
 */
export async function mintTokens(req: AuthRequest, res: Response) {
    try {
        const { token_mint, wallet_address, amount } = req.body;

        if (!token_mint || !wallet_address || !amount) {
            return res.status(400).json({
                success: false,
                error: 'token_mint, wallet_address, and amount are required',
            });
        }

        // First, get the security ID for this token mint
        const { data: security, error: securityError } = await supabaseAdmin
            .from('securities')
            .select('id, current_supply, decimals')
            .eq('mint_address', token_mint)
            .single();

        if (securityError || !security) {
            console.error('Security not found for mint:', token_mint, securityError);
            return res.status(404).json({
                success: false,
                error: 'Security not found',
            });
        }

        const adminKeypair = loadAdminKeypair();
        const client = new GatedTokenClient(connection, new Wallet(adminKeypair));

        const result = await client.mintTokens({
            authority: adminKeypair,
            tokenMint: new PublicKey(token_mint),
            recipient: new PublicKey(wallet_address),
            amount: parseInt(amount, 10),
        });

        // Update database (for simulation mode)
        // In production, this would be handled by the indexer processing on-chain events
        const amountInt = parseInt(amount, 10);

        // Update security supply
        const { error: supplyError } = await supabaseAdmin
            .from('securities')
            .update({
                current_supply: (security.current_supply || 0) + amountInt,
                total_supply: (security.current_supply || 0) + amountInt,
            })
            .eq('id', security.id);

        if (supplyError) {
            console.error('Failed to update security supply:', supplyError);
        }

        // Update or create token balance
        const { error: balanceError } = await supabaseAdmin
            .from('token_balances')
            .upsert(
                {
                    security_id: security.id,
                    wallet_address,
                    balance: amountInt, // In production, this would add to existing balance
                    block_height: 0, // Simulation
                    slot: 0, // Simulation
                },
                {
                    onConflict: 'security_id,wallet_address',
                }
            );

        if (balanceError) {
            console.error('Failed to update token balance:', balanceError);
        }

        return res.json({ success: true, ...result });
    } catch (error) {
        console.error('Token minting error:', error);
        return res.status(500).json({ success: false, error: (error as Error).message });
    }
}

/**
 * Execute stock split
 * POST /admin/corporate-actions/split
 */
export async function stockSplit(req: AuthRequest, res: Response) {
    try {
        const { token_mint, split_ratio, new_symbol, new_name } = req.body;

        if (!token_mint || !split_ratio || !new_symbol || !new_name) {
            return res.status(400).json({
                success: false,
                error: 'token_mint, split_ratio, new_symbol, and new_name are required',
            });
        }

        const adminKeypair = loadAdminKeypair();

        const result = await executeStockSplit({
            tokenMint: token_mint,
            splitRatio: parseInt(split_ratio, 10),
            newSymbol: new_symbol,
            newName: new_name,
            authorityKeypair: adminKeypair,
        });

        return res.json(result);
    } catch (error) {
        console.error('Stock split error:', error);
        return res.status(500).json({ success: false, error: (error as Error).message });
    }
}

/**
 * Change token symbol
 * POST /admin/corporate-actions/change-symbol
 */
export async function changeSymbol(req: AuthRequest, res: Response) {
    try {
        const { token_mint, new_symbol, new_name } = req.body;

        if (!token_mint || !new_symbol || !new_name) {
            return res.status(400).json({
                success: false,
                error: 'token_mint, new_symbol, and new_name are required',
            });
        }

        const adminKeypair = loadAdminKeypair();

        const result = await changeTokenSymbol({
            tokenMint: token_mint,
            newSymbol: new_symbol,
            newName: new_name,
            authorityKeypair: adminKeypair,
        });

        return res.json(result);
    } catch (error) {
        console.error('Symbol change error:', error);
        return res.status(500).json({ success: false, error: (error as Error).message });
    }
}

