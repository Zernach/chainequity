/**
 * Token Handler
 * Handles token initialization and metadata operations
 */

import { BaseClient } from './base';
import type { TokenMetadata, TokenBalance } from '../types';

export interface Security {
    id: string;
    mint_address: string;
    symbol: string;
    name: string;
    decimals: number;
    total_supply: number;
    current_supply: number;
    program_id: string;
    is_active: boolean;
    created_at: string;
}

export class TokenHandler extends BaseClient {
    /**
     * Initialize a new token
     */
    async initializeToken(
        symbol: string,
        name: string,
        decimals: number = 9
    ): Promise<{ success: boolean; mint: string; signature: string }> {
        console.log('[TokenHandler] initializeToken called with:', { symbol, name, decimals });
        console.log('[TokenHandler] Access token available:', !!this.getAccessToken());

        const result = await this.post<{ success: boolean; mint: string; signature: string }>(
            '/admin/token/initialize',
            {
                symbol,
                name,
                decimals,
            },
            true
        );

        console.log('[TokenHandler] Response received:', result);
        return result;
    }

    /**
     * Get all securities
     */
    async getAllSecurities(): Promise<{ success: boolean; securities: Security[]; count: number }> {
        return this.get('/securities', true);
    }

    /**
     * Get security by mint address
     */
    async getSecurityByMint(mintAddress: string): Promise<{ success: boolean; security: Security }> {
        return this.get(`/securities/${mintAddress}`, true);
    }

    /**
     * Get token information
     */
    async getTokenInfo(
        tokenMint: string
    ): Promise<{ success: boolean; token: TokenMetadata }> {
        return this.get(`/token/${tokenMint}/info`, true);
    }

    /**
     * Get token balance for a wallet
     */
    async getBalance(
        tokenMint: string,
        walletAddress: string
    ): Promise<{ success: boolean; balance: TokenBalance }> {
        return this.get(`/token/${tokenMint}/balance/${walletAddress}`, true);
    }

    /**
     * Get all token holdings for a wallet
     */
    async getWalletHoldings(walletAddress: string): Promise<{
        success: boolean;
        holdings: Array<{
            mint: string;
            symbol: string;
            name: string;
            balance: string;
            decimals: number;
            percentage?: number;
        }>;
        count: number;
    }> {
        return this.get(`/holdings/${walletAddress}`, true);
    }
}

