/**
 * Web Wallet Adapter
 * Supports browser wallet extensions (Phantom, Solflare, etc.) on web platform
 */

import { PublicKey, Transaction } from '@solana/web3.js';
import { Platform } from 'react-native';

// Extend window interface for Solana wallet providers
declare global {
    interface Window {
        solana?: SolanaProvider;
        phantom?: { solana?: SolanaProvider };
        solflare?: SolanaProvider;
        backpack?: SolanaProvider;
    }
}

interface SolanaProvider {
    publicKey: PublicKey | null;
    isConnected: boolean;
    isPhantom?: boolean;
    isSolflare?: boolean;
    isBackpack?: boolean;
    connect: () => Promise<{ publicKey: PublicKey }>;
    disconnect: () => Promise<void>;
    signMessage: (message: Uint8Array, display?: 'utf8' | 'hex') => Promise<{ signature: Uint8Array }>;
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
    signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback: (...args: any[]) => void) => void;
}

export interface WalletAdapter {
    publicKey: PublicKey | null;
    connected: boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
}

export class WebWalletAdapter implements WalletAdapter {
    public publicKey: PublicKey | null = null;
    public connected: boolean = false;

    private provider: SolanaProvider | null = null;
    private walletName: string = 'Unknown';

    constructor() {
        if (Platform.OS !== 'web') {
            console.warn('[WebWallet] Web wallet adapter only works on web platform');
        }
        this.detectProvider();
        this.checkExistingConnection();
    }

    /**
     * Detect available Solana wallet providers in browser
     */
    private detectProvider(): void {
        if (typeof window === 'undefined') {
            return;
        }

        // Check for Phantom
        if (window.phantom?.solana?.isPhantom) {
            this.provider = window.phantom.solana;
            this.walletName = 'Phantom';
            console.log('[WebWallet] Detected Phantom wallet');
            return;
        }

        // Check for Solflare
        if (window.solflare?.isSolflare) {
            this.provider = window.solflare;
            this.walletName = 'Solflare';
            console.log('[WebWallet] Detected Solflare wallet');
            return;
        }

        // Check for Backpack
        if (window.backpack?.isBackpack) {
            this.provider = window.backpack;
            this.walletName = 'Backpack';
            console.log('[WebWallet] Detected Backpack wallet');
            return;
        }

        // Fallback to window.solana (generic Solana provider)
        if (window.solana) {
            this.provider = window.solana;
            this.walletName = 'Solana Wallet';
            console.log('[WebWallet] Detected generic Solana wallet');
            return;
        }

        console.warn('[WebWallet] No Solana wallet detected in browser');
    }

    /**
     * Check if wallet is already connected
     */
    private checkExistingConnection(): void {
        if (!this.provider) {
            return;
        }

        // Check if wallet is already connected (e.g., from a previous session)
        if (this.provider.isConnected && this.provider.publicKey) {
            console.log('[WebWallet] Found existing connection:', this.provider.publicKey.toBase58());
            this.publicKey = this.provider.publicKey;
            this.connected = true;
            this.setupEventListeners();
        }
    }

    /**
     * Check if a wallet is available
     */
    isAvailable(): boolean {
        return this.provider !== null;
    }

    /**
     * Get list of detected wallets
     */
    static getAvailableWallets(): string[] {
        if (typeof window === 'undefined') {
            return [];
        }

        const wallets: string[] = [];

        if (window.phantom?.solana?.isPhantom) {
            wallets.push('Phantom');
        }
        if (window.solflare?.isSolflare) {
            wallets.push('Solflare');
        }
        if (window.backpack?.isBackpack) {
            wallets.push('Backpack');
        }
        if (window.solana && wallets.length === 0) {
            wallets.push('Solana Wallet');
        }

        return wallets;
    }

    /**
     * Connect to web wallet
     */
    async connect(): Promise<void> {
        if (!this.provider) {
            throw new Error('No Solana wallet detected. Please install Phantom, Solflare, or another Solana wallet extension.');
        }

        try {
            console.log('[WebWallet] Connecting to', this.walletName);

            // Request connection (this will trigger the wallet popup)
            const response = await this.provider.connect();

            console.log('[WebWallet] Connection response:', response);
            console.log('[WebWallet] Provider publicKey after connect:', this.provider.publicKey);

            // Some wallets return publicKey in response, others set it on the provider
            this.publicKey = response.publicKey || this.provider.publicKey;
            this.connected = this.publicKey !== null;

            if (!this.publicKey) {
                throw new Error('Failed to retrieve public key from wallet');
            }

            // Set up event listeners
            this.setupEventListeners();

            console.log('[WebWallet] Connected:', this.publicKey.toBase58());
        } catch (error) {
            console.error('[WebWallet] Connection error:', error);
            throw error;
        }
    }

    /**
     * Set up wallet event listeners
     */
    private setupEventListeners(): void {
        if (!this.provider) return;

        // Handle account changed
        this.provider.on('accountChanged', (publicKey: PublicKey | null) => {
            console.log('[WebWallet] Account changed:', publicKey?.toBase58());
            if (publicKey) {
                this.publicKey = publicKey;
            } else {
                this.handleDisconnect();
            }
        });

        // Handle disconnect
        this.provider.on('disconnect', () => {
            console.log('[WebWallet] Disconnected');
            this.handleDisconnect();
        });
    }

    /**
     * Disconnect from wallet
     */
    async disconnect(): Promise<void> {
        if (!this.provider) {
            return;
        }

        try {
            console.log('[WebWallet] Disconnecting...');
            await this.provider.disconnect();
            this.handleDisconnect();
        } catch (error) {
            console.error('[WebWallet] Disconnect error:', error);
            throw error;
        }
    }

    /**
     * Handle disconnect cleanup
     */
    private handleDisconnect(): void {
        this.publicKey = null;
        this.connected = false;
    }

    /**
     * Sign a message
     */
    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        if (!this.connected || !this.publicKey) {
            throw new Error('Wallet not connected');
        }

        if (!this.provider) {
            throw new Error('No wallet provider available');
        }

        try {
            console.log('[WebWallet] Requesting message signature...');

            // Request signature from wallet
            const { signature } = await this.provider.signMessage(message, 'utf8');

            console.log('[WebWallet] Message signed');
            return signature;
        } catch (error) {
            console.error('[WebWallet] Sign message error:', error);
            throw error;
        }
    }

    /**
     * Sign a transaction
     */
    async signTransaction(transaction: Transaction): Promise<Transaction> {
        if (!this.connected || !this.publicKey) {
            throw new Error('Wallet not connected');
        }

        if (!this.provider) {
            throw new Error('No wallet provider available');
        }

        try {
            console.log('[WebWallet] Requesting transaction signature...');

            // Request transaction signature from wallet
            const signedTx = await this.provider.signTransaction(transaction);

            console.log('[WebWallet] Transaction signed');
            return signedTx;
        } catch (error) {
            console.error('[WebWallet] Sign transaction error:', error);
            throw error;
        }
    }

    /**
     * Get wallet info
     */
    getInfo(): { name: string; icon?: string; connected: boolean } {
        return {
            name: this.walletName,
            connected: this.connected,
        };
    }

    /**
     * Open wallet installation page
     */
    static openInstallPage(): void {
        const url = 'https://phantom.app/download';
        if (typeof window !== 'undefined') {
            window.open(url, '_blank');
        }
    }
}

/**
 * Factory function to create a web wallet adapter
 */
export function createWebWalletAdapter(): WebWalletAdapter {
    return new WebWalletAdapter();
}

