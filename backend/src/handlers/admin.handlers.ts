import { Response } from 'express';
import { Wallet } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { connection } from '../solana';
import { GatedTokenClient, loadAdminKeypair } from '../program-client';
import { executeStockSplit, changeTokenSymbol } from '../corporate-actions';
import { AuthRequest } from '../types/auth.types';

/**
 * Initialize new token
 * POST /admin/token/initialize
 */
export async function initializeToken(req: AuthRequest, res: Response) {
    try {
        const { symbol, name, decimals } = req.body;

        if (!symbol || !name) {
            return res.status(400).json({
                success: false,
                error: 'Symbol and name are required',
            });
        }

        const adminKeypair = loadAdminKeypair();
        const client = new GatedTokenClient(connection, new Wallet(adminKeypair));

        const mint = Keypair.generate();
        const result = await client.initializeToken({
            mint,
            authority: adminKeypair,
            symbol,
            name,
            decimals: decimals || 9,
        });

        return res.json({ success: true, ...result });
    } catch (error) {
        console.error('Token initialization error:', error);
        return res.status(500).json({ success: false, error: (error as Error).message });
    }
}

/**
 * Approve wallet on allowlist
 * POST /admin/allowlist/approve
 */
export async function approveWallet(req: AuthRequest, res: Response) {
    try {
        const { tokenMint, walletAddress } = req.body;

        if (!tokenMint || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'tokenMint and walletAddress are required',
            });
        }

        const adminKeypair = loadAdminKeypair();
        const client = new GatedTokenClient(connection, new Wallet(adminKeypair));

        const result = await client.approveWallet({
            authority: adminKeypair,
            tokenMint: new PublicKey(tokenMint),
            walletToApprove: new PublicKey(walletAddress),
        });

        return res.json({ success: true, ...result });
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
        const { tokenMint, walletAddress } = req.body;

        if (!tokenMint || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'tokenMint and walletAddress are required',
            });
        }

        const adminKeypair = loadAdminKeypair();
        const client = new GatedTokenClient(connection, new Wallet(adminKeypair));

        const result = await client.revokeWallet({
            authority: adminKeypair,
            tokenMint: new PublicKey(tokenMint),
            walletToRevoke: new PublicKey(walletAddress),
        });

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
        const { tokenMint, recipient, amount } = req.body;

        if (!tokenMint || !recipient || !amount) {
            return res.status(400).json({
                success: false,
                error: 'tokenMint, recipient, and amount are required',
            });
        }

        const adminKeypair = loadAdminKeypair();
        const client = new GatedTokenClient(connection, new Wallet(adminKeypair));

        const result = await client.mintTokens({
            authority: adminKeypair,
            tokenMint: new PublicKey(tokenMint),
            recipient: new PublicKey(recipient),
            amount: parseInt(amount, 10),
        });

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
        const { tokenMint, splitRatio, newSymbol, newName } = req.body;

        if (!tokenMint || !splitRatio || !newSymbol || !newName) {
            return res.status(400).json({
                success: false,
                error: 'tokenMint, splitRatio, newSymbol, and newName are required',
            });
        }

        const adminKeypair = loadAdminKeypair();

        const result = await executeStockSplit({
            tokenMint,
            splitRatio: parseInt(splitRatio, 10),
            newSymbol,
            newName,
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
        const { tokenMint, newSymbol, newName } = req.body;

        if (!tokenMint || !newSymbol || !newName) {
            return res.status(400).json({
                success: false,
                error: 'tokenMint, newSymbol, and newName are required',
            });
        }

        const adminKeypair = loadAdminKeypair();

        const result = await changeTokenSymbol({
            tokenMint,
            newSymbol,
            newName,
            authorityKeypair: adminKeypair,
        });

        return res.json(result);
    } catch (error) {
        console.error('Symbol change error:', error);
        return res.status(500).json({ success: false, error: (error as Error).message });
    }
}

