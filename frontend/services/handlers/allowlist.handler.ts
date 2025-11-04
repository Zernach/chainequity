/**
 * Allowlist Handler
 * Handles allowlist management operations
 */

import { BaseClient } from './base';
import type {
    ApproveWalletRequest,
    ApproveWalletResponse,
    AllowlistEntry,
} from '../types';

export class AllowlistHandler extends BaseClient {
    /**
     * Approve a wallet for a token
     */
    async approveWallet(data: ApproveWalletRequest): Promise<ApproveWalletResponse> {
        return this.post<ApproveWalletResponse>('/admin/allowlist/approve', data);
    }

    /**
     * Revoke wallet approval
     */
    async revokeWallet(
        tokenMint: string,
        walletAddress: string
    ): Promise<{ success: boolean }> {
        return this.post('/admin/allowlist/revoke', {
            token_mint: tokenMint,
            wallet_address: walletAddress,
        });
    }

    /**
     * Get allowlist entries for a token
     */
    async getAllowlist(
        tokenMint: string
    ): Promise<{ success: boolean; entries: AllowlistEntry[] }> {
        return this.get(`/admin/allowlist/${tokenMint}`);
    }

    /**
     * Check allowlist status for a specific wallet
     */
    async checkAllowlistStatus(
        tokenMint: string,
        walletAddress: string
    ): Promise<{ success: boolean; entry: AllowlistEntry }> {
        return this.get(`/allowlist/${tokenMint}/${walletAddress}`);
    }
}

