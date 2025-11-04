/**
 * WalletConnect Adapter for Solana
 * Supports real wallet connections via WalletConnect protocol
 * Works with Phantom, Solflare, Backpack, and other Solana wallets
 */

import '@walletconnect/react-native-compat';
import { Core } from '@walletconnect/core';
import { Web3Wallet, type Web3WalletTypes } from '@walletconnect/web3wallet';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Linking, Platform } from 'react-native';
import bs58 from 'bs58';

export interface WalletConnectConfig {
    projectId: string;
    metadata: {
        name: string;
        description: string;
        url: string;
        icons: string[];
    };
}

export interface WalletAdapter {
    publicKey: PublicKey | null;
    connected: boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
}

export class WalletConnectAdapter implements WalletAdapter {
    public publicKey: PublicKey | null = null;
    public connected: boolean = false;

    private config: WalletConnectConfig;
    private web3wallet: Web3Wallet | null = null;
    private session: Web3WalletTypes.SessionTypes.Struct | null = null;
    private core: Core | null = null;

    constructor(config: WalletConnectConfig) {
        this.config = config;
        console.log('[WalletConnect] Initialized with project ID:', config.projectId.substring(0, 8) + '...');
    }

    /**
     * Initialize WalletConnect
     */
    private async initialize(): Promise<void> {
        if (this.web3wallet) {
            return; // Already initialized
        }

        try {
            console.log('[WalletConnect] Initializing...');

            // Initialize Core
            this.core = new Core({
                projectId: this.config.projectId,
            });

            // Initialize Web3Wallet
            this.web3wallet = await Web3Wallet.init({
                core: this.core,
                metadata: this.config.metadata,
            });

            // Set up event listeners
            this.setupEventListeners();

            console.log('[WalletConnect] Initialized successfully');
        } catch (error) {
            console.error('[WalletConnect] Initialization error:', error);
            throw new Error('Failed to initialize WalletConnect');
        }
    }

    /**
     * Set up WalletConnect event listeners
     */
    private setupEventListeners(): void {
        if (!this.web3wallet) return;

        // Handle session proposals
        this.web3wallet.on('session_proposal', async (proposal) => {
            console.log('[WalletConnect] Session proposal received:', proposal);
            // Auto-approve for Solana mainnet/devnet/testnet
            await this.handleSessionProposal(proposal);
        });

        // Handle session requests (sign message, sign transaction)
        this.web3wallet.on('session_request', async (request) => {
            console.log('[WalletConnect] Session request:', request);
            await this.handleSessionRequest(request);
        });

        // Handle session delete
        this.web3wallet.on('session_delete', () => {
            console.log('[WalletConnect] Session deleted');
            this.handleDisconnect();
        });
    }

    /**
     * Handle session proposal
     */
    private async handleSessionProposal(
        proposal: Web3WalletTypes.SessionProposal
    ): Promise<void> {
        try {
            // Get Solana chains from proposal
            const solanaChains = proposal.params.requiredNamespaces.solana?.chains || [];

            if (solanaChains.length === 0) {
                throw new Error('No Solana chains in proposal');
            }

            // For now, auto-approve with a mock account
            // In production, you'd prompt the user and use their actual wallet
            const accounts = solanaChains.map(
                (chain) => `${chain}:${this.publicKey?.toBase58() || '11111111111111111111111111111111'}`
            );

            const namespaces: Web3WalletTypes.SessionNamespaces = {
                solana: {
                    accounts,
                    methods: ['solana_signMessage', 'solana_signTransaction'],
                    events: [],
                },
            };

            // Approve session
            this.session = await this.web3wallet!.approveSession({
                id: proposal.id,
                namespaces,
            });

            console.log('[WalletConnect] Session approved:', this.session.topic);

            // Handle deep linking back to dApp
            this.handleDeepLink(proposal.params.proposer.metadata.redirect);
        } catch (error) {
            console.error('[WalletConnect] Session proposal error:', error);
            await this.web3wallet!.rejectSession({
                id: proposal.id,
                reason: {
                    code: 5000,
                    message: 'User rejected the session',
                },
            });
        }
    }

    /**
     * Handle session request (signing operations)
     */
    private async handleSessionRequest(
        request: Web3WalletTypes.SessionRequest
    ): Promise<void> {
        try {
            const { topic, params, id } = request;
            const { request: requestParams } = params;

            switch (requestParams.method) {
                case 'solana_signMessage':
                    // Handle message signing
                    const message = requestParams.params.message;
                    const signature = await this.signMessage(
                        typeof message === 'string' ? bs58.decode(message) : message
                    );
                    await this.web3wallet!.respondSessionRequest({
                        topic,
                        response: {
                            id,
                            jsonrpc: '2.0',
                            result: bs58.encode(signature),
                        },
                    });
                    break;

                case 'solana_signTransaction':
                    // Handle transaction signing
                    console.log('[WalletConnect] Transaction signing not fully implemented');
                    await this.web3wallet!.respondSessionRequest({
                        topic,
                        response: {
                            id,
                            jsonrpc: '2.0',
                            error: {
                                code: 5001,
                                message: 'Transaction signing not supported yet',
                            },
                        },
                    });
                    break;

                default:
                    throw new Error(`Unsupported method: ${requestParams.method}`);
            }
        } catch (error) {
            console.error('[WalletConnect] Session request error:', error);
        }
    }

    /**
     * Handle deep linking
     */
    private handleDeepLink(redirect?: { native?: string; universal?: string }): void {
        if (!redirect) return;

        const deepLink = Platform.OS === 'ios' ? redirect.universal || redirect.native : redirect.native;

        if (deepLink) {
            Linking.openURL(deepLink).catch((err) => {
                console.error('[WalletConnect] Deep link error:', err);
            });
        }
    }

    /**
     * Connect to wallet via WalletConnect
     */
    async connect(): Promise<void> {
        try {
            console.log('[WalletConnect] Connecting...');

            // Initialize if needed
            await this.initialize();

            if (!this.web3wallet) {
                throw new Error('WalletConnect not initialized');
            }

            // Check if we already have an active session
            const existingSessions = this.web3wallet.getActiveSessions();
            const sessionKeys = Object.keys(existingSessions);

            if (sessionKeys.length > 0) {
                console.log('[WalletConnect] Using existing session');
                this.session = existingSessions[sessionKeys[0]];
                const accounts = this.session.namespaces.solana?.accounts || [];

                if (accounts.length > 0) {
                    const publicKeyStr = accounts[0].split(':')[2];
                    this.publicKey = new PublicKey(publicKeyStr);
                    this.connected = true;
                    console.log('[WalletConnect] Connected with existing session:', this.publicKey.toBase58());
                    return;
                }
            }

            // Create new pairing
            const { uri } = await this.web3wallet.core.pairing.create();

            console.log('[WalletConnect] Pairing URI:', uri);

            // Display URI for connection
            if (Platform.OS === 'web') {
                // On web, you would display a QR code
                console.log('[WalletConnect] Scan this QR code or use the URI:', uri);
                // TODO: Display QR code modal for web
                throw new Error('Please scan QR code to connect (QR display not implemented yet)');
            } else {
                // On mobile, try to open wallet app via deep link
                const walletUri = `phantom://wc?uri=${encodeURIComponent(uri)}`;

                try {
                    await Linking.openURL(walletUri);
                    console.log('[WalletConnect] Opened wallet app');
                } catch (linkError) {
                    console.log('[WalletConnect] Could not open wallet app, user needs to manually connect');
                    throw new Error('No Solana wallet app found. Please install Phantom, Solflare, or another Solana wallet.');
                }

                // Wait for session to be established (via session_proposal event)
                // The actual connection happens in handleSessionProposal
                console.log('[WalletConnect] Waiting for wallet approval...');

                // Set up a one-time promise that resolves when connected
                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout - please approve the connection in your wallet app'));
                    }, 120000); // 2 minute timeout

                    // Check for connection every second
                    const checkInterval = setInterval(() => {
                        if (this.connected) {
                            clearTimeout(timeout);
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 1000);
                });
            }
        } catch (error) {
            console.error('[WalletConnect] Connection error:', error);
            throw error;
        }
    }

    /**
     * Disconnect from wallet
     */
    async disconnect(): Promise<void> {
        try {
            console.log('[WalletConnect] Disconnecting...');

            if (this.session && this.web3wallet) {
                await this.web3wallet.disconnectSession({
                    topic: this.session.topic,
                    reason: {
                        code: 6000,
                        message: 'User disconnected',
                    },
                });
            }

            this.handleDisconnect();
            console.log('[WalletConnect] Disconnected');
        } catch (error) {
            console.error('[WalletConnect] Disconnect error:', error);
            throw error;
        }
    }

    /**
     * Handle disconnect cleanup
     */
    private handleDisconnect(): void {
        this.publicKey = null;
        this.connected = false;
        this.session = null;
    }

    /**
     * Sign a message
     */
    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        if (!this.connected || !this.publicKey) {
            throw new Error('Wallet not connected');
        }

        if (!this.session || !this.web3wallet) {
            throw new Error('No active WalletConnect session');
        }

        console.log('[WalletConnect] Requesting message signature...');

        try {
            // Send signing request to wallet
            const result = await this.web3wallet.request({
                topic: this.session.topic,
                chainId: 'solana:devnet', // or mainnet, testnet
                request: {
                    method: 'solana_signMessage',
                    params: {
                        pubkey: this.publicKey.toBase58(),
                        message: bs58.encode(message),
                    },
                },
            });

            // Decode signature from base58
            const signature = bs58.decode(result as string);
            console.log('[WalletConnect] Message signed');

            return signature;
        } catch (error) {
            console.error('[WalletConnect] Sign message error:', error);
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

        if (!this.session || !this.web3wallet) {
            throw new Error('No active WalletConnect session');
        }

        console.log('[WalletConnect] Requesting transaction signature...');

        try {
            // Serialize transaction
            const serialized = transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false,
            });

            // Send signing request to wallet
            const result = await this.web3wallet.request({
                topic: this.session.topic,
                chainId: 'solana:devnet',
                request: {
                    method: 'solana_signTransaction',
                    params: {
                        pubkey: this.publicKey.toBase58(),
                        transaction: bs58.encode(serialized),
                    },
                },
            });

            // Deserialize signed transaction
            const signedTx = Transaction.from(bs58.decode(result as string));
            console.log('[WalletConnect] Transaction signed');

            return signedTx;
        } catch (error) {
            console.error('[WalletConnect] Sign transaction error:', error);
            throw error;
        }
    }

    /**
     * Get wallet info
     */
    getInfo(): { name: string; icon?: string; connected: boolean } {
        return {
            name: 'WalletConnect',
            connected: this.connected,
        };
    }
}

/**
 * Factory function to create a WalletConnect adapter
 */
export function createWalletConnectAdapter(config: WalletConnectConfig): WalletConnectAdapter {
    return new WalletConnectAdapter(config);
}

