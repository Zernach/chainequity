/**
 * Wallet Connection Hook
 * Manages Solana wallet connections with environment-based adapter selection
 * Supports: Mock Wallet (dev), WalletConnect (mobile), Web Wallets (browser extensions)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Platform } from 'react-native';
import bs58 from 'bs58';

// Import wallet adapters
import { MockWallet, createMockWallet } from './wallets/MockWallet';
import { WalletConnectAdapter, createWalletConnectAdapter } from './wallets/WalletConnectAdapter';
import { WebWalletAdapter, createWebWalletAdapter } from './wallets/WebWalletAdapter';

// Base wallet adapter interface
export interface WalletAdapter {
    publicKey: PublicKey | null;
    connected: boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
}

// Hook return interface
export interface UseWalletConnectionReturn {
    publicKey: PublicKey | null;
    connected: boolean;
    connecting: boolean;
    walletAddress: string | null;
    walletType: 'mock' | 'walletconnect' | 'web' | null;
    connect: () => Promise<void>;
    connectWithAddress?: (address: string) => Promise<void>; // Only for mock wallet
    disconnect: () => Promise<void>;
    signMessage: (message: string) => Promise<string>;
    error: Error | null;
}

/**
 * Get wallet configuration from environment
 */
function getWalletConfig() {
    // Default to mock wallet if not explicitly set to false
    const envValue = process.env.EXPO_PUBLIC_USE_MOCK_WALLET;
    const useMockWallet = envValue !== 'false'; // true unless explicitly 'false'
    const walletConnectProjectId = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID || '';
    const mockWalletAddress = process.env.EXPO_PUBLIC_MOCK_WALLET_ADDRESS;

    console.log('[WalletConfig] USE_MOCK_WALLET env:', envValue);
    console.log('[WalletConfig] useMockWallet:', useMockWallet);
    console.log('[WalletConfig] walletConnectProjectId:', walletConnectProjectId ? 'Set' : 'Not set');

    return {
        useMockWallet,
        walletConnectProjectId,
        mockWalletAddress,
    };
}

/**
 * Create appropriate wallet adapter based on environment and platform
 */
function createWalletAdapter(): WalletAdapter {
    const config = getWalletConfig();

    // Use mock wallet if explicitly enabled
    if (config.useMockWallet) {
        console.log('[useWalletConnection] Using Mock Wallet (development mode)');
        return createMockWallet({
            customAddress: config.mockWalletAddress,
        });
    }

    // Use Web Wallet adapter for web platform
    if (Platform.OS === 'web') {
        console.log('[useWalletConnection] Using Web Wallet adapter (browser extensions)');
        const webWallet = createWebWalletAdapter();

        if (!webWallet.isAvailable()) {
            console.warn('[useWalletConnection] No web wallet detected, falling back to mock');
            return createMockWallet();
        }

        return webWallet;
    }

    // Use WalletConnect for mobile platforms
    if (config.walletConnectProjectId) {
        console.log('[useWalletConnection] Using WalletConnect adapter (mobile)');
        return createWalletConnectAdapter({
            projectId: config.walletConnectProjectId,
            metadata: {
                name: 'ChainEquity',
                description: 'Tokenized equity management platform',
                url: 'https://peaksix.chainequity.archlife.org',
                icons: ['https://peaksix.chainequity.archlife.org/icon.png'],
            },
        });
    }

    // Fallback to mock wallet
    console.warn('[useWalletConnection] No WalletConnect project ID configured, using mock wallet');
    return createMockWallet();
}

/**
 * Custom hook for managing wallet connections
 */
export function useWalletConnection(): UseWalletConnectionReturn {
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Create wallet adapter (memoized to avoid recreation)
    const wallet = useMemo(() => createWalletAdapter(), []);

    // Determine wallet type
    const walletType = useMemo(() => {
        if (wallet instanceof MockWallet) return 'mock';
        if (wallet instanceof WalletConnectAdapter) return 'walletconnect';
        if (wallet instanceof WebWalletAdapter) return 'web';
        return null;
    }, [wallet]);

    /**
     * Connect to wallet
     */
    const connect = useCallback(async () => {
        setConnecting(true);
        setError(null);

        try {
            console.log('[useWalletConnection] Starting wallet connection...');
            await wallet.connect();

            console.log('[useWalletConnection] Wallet adapter connected:', wallet.connected);
            console.log('[useWalletConnection] Wallet adapter publicKey:', wallet.publicKey?.toBase58());

            // Update state with wallet values
            setPublicKey(wallet.publicKey);
            setConnected(wallet.connected);

            console.log('[useWalletConnection] State updated - Connected:', wallet.connected, 'Public Key:', wallet.publicKey?.toBase58());
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to connect wallet');
            setError(error);
            console.error('[useWalletConnection] Connect error:', error);
        } finally {
            setConnecting(false);
        }
    }, [wallet]);

    /**
     * Connect with specific address (mock wallet only)
     */
    const connectWithAddress = useCallback(
        async (address: string) => {
            if (!(wallet instanceof MockWallet)) {
                throw new Error('connectWithAddress is only available for mock wallet');
            }

            setConnecting(true);
            setError(null);

            try {
                await wallet.connectWithAddress(address);
                setPublicKey(wallet.publicKey);
                setConnected(wallet.connected);
                console.log('[useWalletConnection] Wallet connected with custom address - Public Key:', wallet.publicKey?.toBase58());
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to connect wallet');
                setError(error);
                console.error('[useWalletConnection] Connect error:', error);
            } finally {
                setConnecting(false);
            }
        },
        [wallet]
    );

    /**
     * Disconnect from wallet
     */
    const disconnect = useCallback(async () => {
        try {
            await wallet.disconnect();
            setPublicKey(null);
            setConnected(false);
            setError(null);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to disconnect wallet');
            setError(error);
            console.error('[useWalletConnection] Disconnect error:', error);
        }
    }, [wallet]);

    /**
     * Sign a message
     */
    const signMessage = useCallback(
        async (message: string): Promise<string> => {
            if (!connected || !publicKey) {
                throw new Error('Wallet not connected');
            }

            try {
                const messageBytes = new TextEncoder().encode(message);
                const signatureBytes = await wallet.signMessage(messageBytes);
                const signature = bs58.encode(signatureBytes);

                return signature;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to sign message');
                setError(error);
                console.error('[useWalletConnection] Sign message error:', error);
                throw error;
            }
        },
        [connected, publicKey, wallet]
    );

    // Check if wallet is already connected on mount (for web wallets)
    useEffect(() => {
        const checkExistingConnection = async () => {
            if (wallet instanceof WebWalletAdapter) {
                // Check if the wallet provider is already connected
                const provider = (wallet as any).provider;
                if (provider && provider.isConnected && provider.publicKey) {
                    console.log('[useWalletConnection] Existing wallet connection detected');
                    setPublicKey(provider.publicKey);
                    setConnected(true);
                    (wallet as any).publicKey = provider.publicKey;
                    (wallet as any).connected = true;
                    console.log('[useWalletConnection] Restored connection - Public Key:', provider.publicKey.toBase58());
                }
            }
        };

        checkExistingConnection();
    }, [wallet]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (connected) {
                disconnect().catch(console.error);
            }
        };
    }, []);

    return {
        publicKey,
        connected,
        connecting,
        walletAddress: publicKey?.toBase58() || null,
        walletType,
        connect,
        connectWithAddress: walletType === 'mock' ? connectWithAddress : undefined,
        disconnect,
        signMessage,
        error,
    };
}

/**
 * Helper function to format wallet address for display
 */
export function formatWalletAddress(address: string, chars: number = 4): string {
    if (!address) return '';
    if (address.length <= chars * 2) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Helper function to validate Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}
