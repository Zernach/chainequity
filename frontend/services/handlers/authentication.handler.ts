/**
 * Authentication Handler
 * Handles email/password authentication operations
 */

import { createClient } from '@supabase/supabase-js';
import { BaseClient } from './base';
import type {
    SignupRequest,
    LoginRequest,
    AuthResponse,
} from '../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class AuthenticationHandler extends BaseClient {
    // Note: Email/password authentication has been removed
    // Use WalletHandler for authentication instead

    /**
     * Sign out
     */
    async signOut(): Promise<{ success: boolean; error?: string }> {
        try {
            // Call backend logout endpoint
            if (this.accessToken) {
                await this.post('/auth/logout', {}, true);
            }

            // Sign out from Supabase
            await supabase.auth.signOut();

            // Clear access token
            this.setAccessToken(null);

            return { success: true };
        } catch (error) {
            console.error('[AuthenticationHandler] Logout error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Logout failed',
            };
        }
    }

    /**
     * Get current user profile
     */
    async getCurrentUser(): Promise<AuthResponse> {
        try {
            if (!this.accessToken) {
                return {
                    success: false,
                    error: 'Not authenticated',
                };
            }

            const response = await this.get<AuthResponse>('/auth/me', true);

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch user');
            }

            return response;
        } catch (error) {
            console.error('[AuthenticationHandler] Get user error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch user',
            };
        }
    }

    /**
     * Restore session from stored token
     */
    async restoreSession(accessToken: string): Promise<AuthResponse> {
        try {
            this.setAccessToken(accessToken);
            return await this.getCurrentUser();
        } catch (error) {
            console.error('[AuthenticationHandler] Restore session error:', error);
            return {
                success: false,
                error: 'Failed to restore session',
            };
        }
    }
}

