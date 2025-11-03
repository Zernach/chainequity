/**
 * Types for Solana operations
 */

export interface WalletInfo {
    publicKey: string;
    secretKey: number[];
}

export interface MintTokenResult {
    success: boolean;
    signature?: string;
    publicKey?: string;
    balance?: number;
    network?: string;
    error?: string;
}

export interface BalanceResult {
    balance: number;
    publicKey: string;
}

