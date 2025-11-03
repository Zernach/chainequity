import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    clusterApiUrl,
    Cluster,
} from '@solana/web3.js';
import dotenv from 'dotenv';
import { WalletInfo, MintTokenResult } from './types/solana.types';

dotenv.config();

const network = (process.env.SOLANA_NETWORK || 'devnet') as Cluster;
export const connection = new Connection(clusterApiUrl(network), 'confirmed');

/**
 * Create a new Solana wallet (keypair)
 */
export function createWallet(): WalletInfo {
    const keypair = Keypair.generate();
    return {
        publicKey: keypair.publicKey.toString(),
        secretKey: Array.from(keypair.secretKey),
    };
}

/**
 * Mint SOL tokens (devnet only - this actually requests an airdrop)
 * In production, this would be a proper SPL token mint
 */
export async function mintToken(
    _publicKeyString: string | null,
    amount: number = 1
): Promise<MintTokenResult> {
    try {
        const publicKey = Keypair.generate().publicKey; // For demo, generate new wallet

        // Request airdrop (only works on devnet/testnet)
        console.log(`Requesting airdrop of ${amount} SOL to ${publicKey.toString()}`);
        const signature = await connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);

        // Confirm transaction
        await connection.confirmTransaction(signature);

        const balance = await connection.getBalance(publicKey);

        return {
            success: true,
            signature,
            publicKey: publicKey.toString(),
            balance: balance / LAMPORTS_PER_SOL,
            network,
        };
    } catch (error) {
        console.error('Error minting token:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get wallet balance
 */
export async function getBalance(publicKeyString: string): Promise<number | null> {
    try {
        const publicKey = new PublicKey(publicKeyString);
        const balance = await connection.getBalance(publicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error('Error getting balance:', error);
        return null;
    }
}

