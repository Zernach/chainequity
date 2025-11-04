import { Response } from 'express';
import { mintToken, createWallet, getBalance } from '../solana';
import { broadcastSolanaTransaction } from '../websocket';
import { AuthRequest } from '../types/auth.types';

/**
 * Mint Solana token (devnet airdrop) - authenticated users only
 * POST /mint-token
 */
export async function handleMintToken(req: AuthRequest, res: Response) {
    try {
        const { amount } = req.body;
        const tokenAmount = amount || 1;

        console.log(`Minting ${tokenAmount} SOL on devnet...`);
        const result = await mintToken(null, tokenAmount);

        if (result.success) {
            broadcastSolanaTransaction(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Error in mint-token endpoint:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Create new Solana wallet - authenticated users only
 * POST /create-wallet
 */
export async function handleCreateWallet(_req: AuthRequest, res: Response) {
    try {
        const wallet = createWallet();
        res.json({
            success: true,
            wallet,
        });
    } catch (error) {
        console.error('Error creating wallet:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Get wallet balance - authenticated users only
 * GET /balance/:publicKey
 */
export async function handleGetBalance(req: AuthRequest, res: Response) {
    try {
        const { publicKey } = req.params;
        const balance = await getBalance(publicKey);

        if (balance === null) {
            return res.status(400).json({
                success: false,
                error: 'Invalid public key or unable to fetch balance',
            });
        }

        return res.json({
            success: true,
            publicKey,
            balance,
        });
    } catch (error) {
        console.error('Error getting balance:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

