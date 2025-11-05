/**
 * Authentication Context
 * Provides global authentication state and methods
 */

import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { authService, supabase } from '../services/auth';
import { api } from '../services/api';
import {
    AuthUser,
    Session,
    LinkWalletRequest,
    WalletLoginRequest,
} from '../services/types';

// Keys for secure storage
const ACCESS_TOKEN_KEY = 'chainequity_access_token';
const REFRESH_TOKEN_KEY = 'chainequity_refresh_token';
const SESSION_KEY = 'chainequity_session';

interface AuthContextValue {
    user: AuthUser | null;
    session: Session | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: Error | null;
    signOut: () => Promise<void>;
    linkWallet: (data: LinkWalletRequest) => Promise<void>;
    walletLogin: (data: WalletLoginRequest) => Promise<void>;
    refreshUser: () => Promise<void>;
    clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

// Helper to store data securely
async function secureStoreSet(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
        // For web, use localStorage
        localStorage.setItem(key, value);
    } else {
        // For native, use SecureStore
        await SecureStore.setItemAsync(key, value);
    }
}

// Helper to retrieve data securely
async function secureStoreGet(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        return localStorage.getItem(key);
    } else {
        return await SecureStore.getItemAsync(key);
    }
}

// Helper to delete data securely
async function secureStoreDelete(key: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const isAuthenticated = !!user && !!session;

    // Store session in secure storage
    const storeSession = useCallback(async (newSession: Session) => {
        try {
            await secureStoreSet(ACCESS_TOKEN_KEY, newSession.access_token);
            await secureStoreSet(REFRESH_TOKEN_KEY, newSession.refresh_token);
            await secureStoreSet(SESSION_KEY, JSON.stringify(newSession));
            setSession(newSession);
            authService.setAccessToken(newSession.access_token);
            api.setAccessToken(newSession.access_token);
        } catch (err) {
            console.error('[AuthContext] Store session error:', err);
        }
    }, []);

    // Clear session from secure storage
    const clearSession = useCallback(async () => {
        try {
            await secureStoreDelete(ACCESS_TOKEN_KEY);
            await secureStoreDelete(REFRESH_TOKEN_KEY);
            await secureStoreDelete(SESSION_KEY);
            setSession(null);
            setUser(null);
            authService.setAccessToken(null);
            api.setAccessToken(null);
        } catch (err) {
            console.error('[AuthContext] Clear session error:', err);
        }
    }, []);

    // Refresh user profile
    const refreshUser = useCallback(async () => {
        try {
            const result = await authService.getCurrentUser();
            if (result.success && result.user) {
                setUser(result.user);
            } else {
                throw new Error(result.error || 'Failed to fetch user');
            }
        } catch (err) {
            console.error('[AuthContext] Refresh user error:', err);
            const error = err instanceof Error ? err : new Error('Failed to refresh user');
            setError(error);
            // If refresh fails, clear session
            await clearSession();
        }
    }, [clearSession]);

    // Restore session on mount
    useEffect(() => {
        const restoreSession = async () => {
            try {
                setLoading(true);

                const storedSession = await secureStoreGet(SESSION_KEY);
                if (!storedSession) {
                    setLoading(false);
                    return;
                }

                const parsedSession: Session = JSON.parse(storedSession);

                // Check if session is expired
                const now = Date.now() / 1000;
                if (parsedSession.expires_at && parsedSession.expires_at < now) {
                    console.log('[AuthContext] Session expired');
                    await clearSession();
                    setLoading(false);
                    return;
                }

                // Restore session
                authService.setAccessToken(parsedSession.access_token);
                api.setAccessToken(parsedSession.access_token);
                setSession(parsedSession);

                // Fetch current user
                const result = await authService.getCurrentUser();
                if (result.success && result.user) {
                    setUser(result.user);
                } else {
                    await clearSession();
                }
            } catch (err) {
                console.error('[AuthContext] Restore session error:', err);
                await clearSession();
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, [clearSession]);

    // Listen to Supabase auth state changes
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
            console.log('[AuthContext] Auth state changed:', event);

            if (event === 'SIGNED_OUT') {
                await clearSession();
            } else if (event === 'SIGNED_IN' && supabaseSession) {
                const newSession: Session = {
                    access_token: supabaseSession.access_token,
                    refresh_token: supabaseSession.refresh_token || '',
                    expires_in: supabaseSession.expires_in || 3600,
                    expires_at: supabaseSession.expires_at || 0,
                };
                await storeSession(newSession);
                await refreshUser();
            } else if (event === 'TOKEN_REFRESHED' && supabaseSession) {
                const newSession: Session = {
                    access_token: supabaseSession.access_token,
                    refresh_token: supabaseSession.refresh_token || '',
                    expires_in: supabaseSession.expires_in || 3600,
                    expires_at: supabaseSession.expires_at || 0,
                };
                await storeSession(newSession);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [clearSession, storeSession, refreshUser]);

    // Note: Email/password authentication methods (signUp, signIn) have been removed
    // Use walletLogin for authentication

    // Sign out
    const signOut = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            await authService.signOut();
            await clearSession();
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Logout failed');
            setError(error);
            console.error('[AuthContext] Sign out error:', error);
        } finally {
            setLoading(false);
        }
    }, [clearSession]);

    // Link wallet
    const linkWallet = useCallback(
        async (data: LinkWalletRequest) => {
            try {
                setLoading(true);
                setError(null);

                console.log('[AuthContext] Linking wallet:', data.wallet_address);
                const result = await authService.linkWallet(data);

                if (!result.success) {
                    throw new Error(result.error || 'Failed to link wallet');
                }

                console.log('[AuthContext] Link wallet result:', result);

                // Refresh user to get updated wallet info
                if (result.user) {
                    console.log('[AuthContext] Updating user from result:', result.user);
                    console.log('[AuthContext] User ID:', result.user.id);
                    setUser(result.user);
                } else {
                    console.log('[AuthContext] Refreshing user...');
                    await refreshUser();
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to link wallet');
                setError(error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [refreshUser]
    );

    // Wallet login
    const walletLogin = useCallback(
        async (data: WalletLoginRequest) => {
            try {
                setLoading(true);
                setError(null);

                const result = await authService.walletLogin(data);

                if (!result.success) {
                    throw new Error(result.error || 'Wallet login failed');
                }

                if (result.session && result.user) {
                    await storeSession(result.session);
                    setUser(result.user);
                } else if (result.user) {
                    // If no session returned, we might need to fetch it
                    setUser(result.user);
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Wallet login failed');
                setError(error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [storeSession]
    );

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: AuthContextValue = {
        user,
        session,
        isAuthenticated,
        loading,
        error,
        signOut,
        linkWallet,
        walletLogin,
        refreshUser,
        clearError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

