/**
 * Token Handler
 * Handles token initialization and metadata operations
 */

import { BaseClient } from './base';
import type { TokenMetadata, TokenBalance } from '../types';

export class TokenHandler extends BaseClient {
    /**
     * Initialize a new token
     */
    async initializeToken(
        symbol: string,
        name: string,
        decimals: number = 9
    ): Promise<{ success: boolean; mint: string; signature: string }> {
        return this.post('/admin/token/initialize', {
            symbol,
            name,
            decimals,
        });
    }

    /**
     * Get token information
     */
    async getTokenInfo(
        tokenMint: string
    ): Promise<{ success: boolean; token: TokenMetadata }> {
        return this.get(`/token/${tokenMint}/info`);
    }

    /**
     * Get token balance for a wallet
     */
    async getBalance(
        tokenMint: string,
        walletAddress: string
    ): Promise<{ success: boolean; balance: TokenBalance }> {
        return this.get(`/token/${tokenMint}/balance/${walletAddress}`);
    }
}

