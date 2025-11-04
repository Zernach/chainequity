/**
 * Wallet Handler
 * Handles wallet-related authentication operations
 */

import { BaseClient } from './base';
import { supabase } from './authentication.handler';
import type {
    LinkWalletRequest,
    WalletLoginRequest,
    VerifyWalletRequest,
    AuthResponse,
    VerifyWalletResponse,
} from '../types';

export class WalletHandler extends BaseClient {
    /**
     * Link wallet to existing authenticated user
     */
    async linkWallet(data: LinkWalletRequest): Promise<AuthResponse> {
        try {
            if (!this.accessToken) {
                return {
                    success: false,
                    error: 'Not authenticated',
                };
            }

            const response = await this.post<AuthResponse>(
                '/auth/link-wallet',
                data,
                true
            );

            if (!response.success) {
                throw new Error(response.error || 'Failed to link wallet');
            }

            return response;
        } catch (error) {
            console.error('[WalletHandler] Link wallet error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to link wallet',
            };
        }
    }

    /**
     * Verify wallet signature without linking
     */
    async verifyWallet(data: VerifyWalletRequest): Promise<VerifyWalletResponse> {
        try {
            const response = await this.post<VerifyWalletResponse>(
                '/auth/verify-wallet',
                data
            );

            if (!response.success) {
                throw new Error(response.error || 'Wallet verification failed');
            }

            return response;
        } catch (error) {
            console.error('[WalletHandler] Verify wallet error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Verification failed',
            };
        }
    }

    /**
     * Login or create account with wallet
     */
    async walletLogin(data: WalletLoginRequest): Promise<AuthResponse> {
        try {
            const response = await this.post<AuthResponse>(
                '/auth/wallet-login',
                data
            );

            if (!response.success) {
                throw new Error(response.error || 'Wallet login failed');
            }

            // Store access token if session is provided
            if (response.session?.access_token) {
                this.setAccessToken(response.session.access_token);

                // Also set the session in Supabase client for consistency
                await supabase.auth.setSession({
                    access_token: response.session.access_token,
                    refresh_token: response.session.refresh_token,
                });
            }

            return response;
        } catch (error) {
            console.error('[WalletHandler] Wallet login error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Wallet login failed',
            };
        }
    }
}

