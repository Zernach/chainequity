/**
 * Mock Wallet Implementation
 * For development and testing purposes only
 * Simulates wallet connection without actual blockchain interaction
 */

import { PublicKey, Transaction } from '@solana/web3.js';

export interface MockWalletConfig {
    customAddress?: string;
    autoConnect?: boolean;
}

export interface WalletAdapter {
    publicKey: PublicKey | null;
    connected: boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
}

export class MockWallet implements WalletAdapter {
    public publicKey: PublicKey | null = null;
    public connected: boolean = false;
    private config: MockWalletConfig;

    constructor(config: MockWalletConfig = {}) {
        this.config = config;
        console.log('[MockWallet] Initialized with config:', config);
    }

    /**
     * Connect to mock wallet
     * In a real wallet, this would open the wallet app and request connection
     */
    async connect(): Promise<void> {
        console.log('[MockWallet] Connecting...');

        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                try {
                    // Use custom address if provided, otherwise use default
                    const address = this.config.customAddress || '11111111111111111111111111111111';

                    // Validate and create PublicKey
                    try {
                        this.publicKey = new PublicKey(address);
                    } catch (error) {
                        throw new Error(`Invalid mock wallet address: ${address}`);
                    }

                    this.connected = true;
                    console.log('[MockWallet] Connected:', this.publicKey.toBase58());
                    resolve();
                } catch (err) {
                    console.error('[MockWallet] Connection error:', err);
                    reject(err);
                }
            }, 1000); // Simulate network delay
        });
    }

    /**
     * Connect with a specific address
     * Useful for testing different wallet addresses
     */
    async connectWithAddress(address: string): Promise<void> {
        console.log('[MockWallet] Connecting with address:', address);

        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                try {
                    // Validate and create PublicKey
                    try {
                        this.publicKey = new PublicKey(address);
                    } catch (error) {
                        throw new Error(`Invalid wallet address: ${address}`);
                    }

                    this.connected = true;
                    console.log('[MockWallet] Connected:', this.publicKey.toBase58());
                    resolve();
                } catch (err) {
                    console.error('[MockWallet] Connection error:', err);
                    reject(err);
                }
            }, 500);
        });
    }

    /**
     * Disconnect from mock wallet
     */
    async disconnect(): Promise<void> {
        console.log('[MockWallet] Disconnecting...');
        this.publicKey = null;
        this.connected = false;
        console.log('[MockWallet] Disconnected');
    }

    /**
     * Sign a message with mock wallet
     * In a real wallet, this would prompt the user to sign in their wallet app
     * Returns a deterministic mock signature
     */
    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        if (!this.connected || !this.publicKey) {
            throw new Error('Wallet not connected');
        }

        console.log('[MockWallet] Signing message...');

        return new Promise<Uint8Array>((resolve, reject) => {
            setTimeout(() => {
                try {
                    // Create a deterministic but unique mock signature
                    // In production, this would be a real ed25519 signature
                    const signature = new Uint8Array(64);

                    // Use message hash to create unique signature
                    let hash = 0;
                    for (let i = 0; i < message.length; i++) {
                        hash = (hash * 31 + message[i]) & 0xffffffff;
                    }

                    // Fill signature with deterministic values
                    for (let i = 0; i < 64; i++) {
                        signature[i] = (hash + i) % 256;
                    }

                    console.log('[MockWallet] Message signed (mock signature)');
                    resolve(signature);
                } catch (err) {
                    console.error('[MockWallet] Signing error:', err);
                    reject(err);
                }
            }, 800); // Simulate user interaction delay
        });
    }

    /**
     * Sign a transaction with mock wallet
     * In a real wallet, this would prompt the user to approve and sign the transaction
     */
    async signTransaction(transaction: Transaction): Promise<Transaction> {
        if (!this.connected || !this.publicKey) {
            throw new Error('Wallet not connected');
        }

        console.log('[MockWallet] Signing transaction...');

        return new Promise<Transaction>((resolve, reject) => {
            setTimeout(() => {
                try {
                    // In a real wallet, this would:
                    // 1. Display transaction details to user
                    // 2. Request user approval
                    // 3. Sign the transaction with the wallet's private key
                    // 4. Return the signed transaction

                    // For mock, just return the transaction as-is
                    console.log('[MockWallet] Transaction signed (mock)');
                    resolve(transaction);
                } catch (err) {
                    console.error('[MockWallet] Transaction signing error:', err);
                    reject(err);
                }
            }, 1000);
        });
    }

    /**
     * Get wallet info
     */
    getInfo(): { name: string; icon?: string; connected: boolean } {
        return {
            name: 'Mock Wallet (Development)',
            connected: this.connected,
        };
    }
}

/**
 * Factory function to create a mock wallet instance
 */
export function createMockWallet(config?: MockWalletConfig): MockWallet {
    return new MockWallet(config);
}

