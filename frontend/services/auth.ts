/**
 * Authentication Service
 * Handles all authentication-related API calls
 * Refactored to use modular handlers for better maintainability
 */

import {
    API_BASE_URL,
    AuthenticationHandler,
    WalletHandler,
    NonceHandler,
    supabase,
} from './handlers';

import type {
    SignupRequest,
    LoginRequest,
    LinkWalletRequest,
    WalletLoginRequest,
    VerifyWalletRequest,
    AuthResponse,
    VerifyWalletResponse,
} from './types';

export { supabase };

/**
 * Unified Auth Service
 * Delegates to specialized handlers while maintaining a single interface
 */
class AuthService {
    private authentication: AuthenticationHandler;
    private wallet: WalletHandler;
    private nonce: NonceHandler;

    constructor(baseURL: string = API_BASE_URL) {
        // Initialize all handlers with the same base URL
        this.authentication = new AuthenticationHandler(baseURL);
        this.wallet = new WalletHandler(baseURL);
        this.nonce = new NonceHandler(baseURL);
    }

    /**
     * Set the access token for authenticated requests
     * Propagates to all handlers that need authentication
     */
    setAccessToken(token: string | null) {
        this.authentication.setAccessToken(token);
        this.wallet.setAccessToken(token);
        this.nonce.setAccessToken(token);
    }

    /**
     * Get the current access token
     */
    getAccessToken(): string | null {
        return this.authentication.getAccessToken();
    }

    // ==================== Email/Password Authentication (DEPRECATED) ====================
    // Note: These methods are deprecated and will return errors
    // Use walletLogin() instead for authentication

    async signOut(): Promise<{ success: boolean; error?: string }> {
        return this.authentication.signOut();
    }

    async getCurrentUser(): Promise<AuthResponse> {
        return this.authentication.getCurrentUser();
    }

    async restoreSession(accessToken: string): Promise<AuthResponse> {
        return this.authentication.restoreSession(accessToken);
    }

    // ==================== Wallet Authentication ====================
    async linkWallet(data: LinkWalletRequest): Promise<AuthResponse> {
        return this.wallet.linkWallet(data);
    }

    async verifyWallet(data: VerifyWalletRequest): Promise<VerifyWalletResponse> {
        return this.wallet.verifyWallet(data);
    }

    async walletLogin(data: WalletLoginRequest): Promise<AuthResponse> {
        return this.wallet.walletLogin(data);
    }

    // ==================== Nonce & Message Generation ====================
    async requestNonce(walletAddress?: string) {
        return this.nonce.requestNonce(walletAddress);
    }

    generateSignatureMessage(nonce: string, timestamp?: number): string {
        return this.nonce.generateSignatureMessage(nonce, timestamp);
    }

    async getWalletMessage(nonce: string): Promise<string> {
        return this.nonce.getWalletMessage(nonce);
    }
}

// Export singleton instance
export const authService = new AuthService();

// Export helper functions for backwards compatibility
export const requestNonce = (walletAddress?: string) =>
    authService.requestNonce(walletAddress);

export const generateSignatureMessage = (nonce: string, timestamp?: number) =>
    authService.generateSignatureMessage(nonce, timestamp);

export const getWalletMessage = (nonce: string) =>
    authService.getWalletMessage(nonce);

