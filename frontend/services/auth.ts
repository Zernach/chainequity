/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import { createClient } from '@supabase/supabase-js';
import {
    AuthUser,
    Session,
    SignupRequest,
    LoginRequest,
    LinkWalletRequest,
    WalletLoginRequest,
    VerifyWalletRequest,
    AuthResponse,
    VerifyWalletResponse,
} from './types';

// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabase client for auth operations
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AuthService {
    private apiUrl: string;
    private accessToken: string | null = null;

    constructor(baseURL: string = API_BASE_URL) {
        this.apiUrl = baseURL;
    }

    /**
     * Set the access token for authenticated requests
     */
    setAccessToken(token: string | null) {
        this.accessToken = token;
    }

    /**
     * Get headers for authenticated requests
     */
    private getHeaders(includeAuth: boolean = false): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (includeAuth && this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        return headers;
    }

    /**
     * Sign up with email and password
     */
    async signUp(data: SignupRequest): Promise<AuthResponse> {
        try {
            const response = await fetch(`${this.apiUrl}/auth/signup`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
            });

            const result: AuthResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Signup failed');
            }

            // After signup, we need to sign in to get a session
            if (result.user) {
                const loginResult = await this.signIn({
                    email: data.email,
                    password: data.password,
                });
                return loginResult;
            }

            return result;
        } catch (error) {
            console.error('[AuthService] Signup error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Signup failed',
            };
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(data: LoginRequest): Promise<AuthResponse> {
        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
            });

            const result: AuthResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Login failed');
            }

            // Store access token
            if (result.session?.access_token) {
                this.setAccessToken(result.session.access_token);
            }

            return result;
        } catch (error) {
            console.error('[AuthService] Login error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Login failed',
            };
        }
    }

    /**
     * Sign out
     */
    async signOut(): Promise<{ success: boolean; error?: string }> {
        try {
            // Call backend logout endpoint
            if (this.accessToken) {
                await fetch(`${this.apiUrl}/auth/logout`, {
                    method: 'POST',
                    headers: this.getHeaders(true),
                });
            }

            // Sign out from Supabase
            await supabase.auth.signOut();

            // Clear access token
            this.setAccessToken(null);

            return { success: true };
        } catch (error) {
            console.error('[AuthService] Logout error:', error);
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

            const response = await fetch(`${this.apiUrl}/auth/me`, {
                method: 'GET',
                headers: this.getHeaders(true),
            });

            const result: AuthResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch user');
            }

            return result;
        } catch (error) {
            console.error('[AuthService] Get user error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch user',
            };
        }
    }

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

            const response = await fetch(`${this.apiUrl}/auth/link-wallet`, {
                method: 'POST',
                headers: this.getHeaders(true),
                body: JSON.stringify(data),
            });

            const result: AuthResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to link wallet');
            }

            return result;
        } catch (error) {
            console.error('[AuthService] Link wallet error:', error);
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
            const response = await fetch(`${this.apiUrl}/auth/verify-wallet`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
            });

            const result: VerifyWalletResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Wallet verification failed');
            }

            return result;
        } catch (error) {
            console.error('[AuthService] Verify wallet error:', error);
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
            const response = await fetch(`${this.apiUrl}/auth/wallet-login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
            });

            const result: AuthResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Wallet login failed');
            }

            // Store access token if session is provided
            if (result.session?.access_token) {
                this.setAccessToken(result.session.access_token);

                // Also set the session in Supabase client for consistency
                await supabase.auth.setSession({
                    access_token: result.session.access_token,
                    refresh_token: result.session.refresh_token,
                });
            }

            return result;
        } catch (error) {
            console.error('[AuthService] Wallet login error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Wallet login failed',
            };
        }
    }

    /**
     * Request a nonce from the backend for wallet signature
     */
    async requestNonce(walletAddress?: string): Promise<{ nonce: string; expiresAt: number; expiresIn: number }> {
        try {
            const response = await fetch(`${this.apiUrl}/auth/request-nonce`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ wallet_address: walletAddress }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to request nonce');
            }

            return {
                nonce: result.nonce,
                expiresAt: result.expiresAt,
                expiresIn: result.expiresIn,
            };
        } catch (error) {
            console.error('[AuthService] Request nonce error:', error);
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
            const response = await fetch(`${this.apiUrl}/auth/wallet-message/${nonce}`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to get wallet message');
            }

            return result.message;
        } catch (error) {
            console.error('[AuthService] Get wallet message error:', error);
            throw error;
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
            console.error('[AuthService] Restore session error:', error);
            return {
                success: false,
                error: 'Failed to restore session',
            };
        }
    }
}

// Export singleton instance
export const authService = new AuthService();

// Export helper functions
export const requestNonce = (walletAddress?: string) => authService.requestNonce(walletAddress);
export const generateSignatureMessage = (nonce: string, timestamp?: number) => authService.generateSignatureMessage(nonce, timestamp);
export const getWalletMessage = (nonce: string) => authService.getWalletMessage(nonce);

