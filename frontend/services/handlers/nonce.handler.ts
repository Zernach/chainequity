/**
 * Nonce Handler
 * Handles nonce generation and wallet message creation
 */

import { BaseClient } from './base';

export interface NonceResponse {
    nonce: string;
    expiresAt: number;
    expiresIn: number;
}

export class NonceHandler extends BaseClient {
    /**
     * Request a nonce from the backend for wallet signature
     */
    async requestNonce(walletAddress?: string): Promise<NonceResponse> {
        try {
            const response = await this.post<{
                success: boolean;
                nonce: string;
                expiresAt: number;
                expiresIn: number;
                error?: string;
            }>('/auth/request-nonce', {
                wallet_address: walletAddress,
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to request nonce');
            }

            return {
                nonce: response.nonce,
                expiresAt: response.expiresAt,
                expiresIn: response.expiresIn,
            };
        } catch (error) {
            console.error('[NonceHandler] Request nonce error:', error);
            throw error;
        }
    }

    /**
     * Generate a message for wallet signature with nonce and timestamp
     */
    generateSignatureMessage(nonce: string, timestamp?: number): string {
        const ts = timestamp || Date.now();
        return `Sign this message to verify wallet ownership.\n\nNonce: ${nonce}\nTimestamp: ${ts}`;
    }

    /**
     * Get formatted wallet message from backend (includes nonce validation)
     */
    async getWalletMessage(nonce: string): Promise<string> {
        try {
            const response = await this.get<{
                success: boolean;
                message: string;
                error?: string;
            }>(`/auth/wallet-message/${nonce}`);

            if (!response.success) {
                throw new Error(response.error || 'Failed to get wallet message');
            }

            return response.message;
        } catch (error) {
            console.error('[NonceHandler] Get wallet message error:', error);
            throw error;
        }
    }
}

