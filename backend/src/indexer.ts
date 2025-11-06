import { Connection, PublicKey, Logs, Context, ConfirmedSignatureInfo } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { supabase } from './db';
import { logger } from './utils/logger';
import {
    broadcastTokenMinted,
    broadcastTokenTransferred,
    broadcastAllowlistUpdate,
} from './websocket';
import {
    ParsedEvent,
    TokenInitializedEventData,
    WalletApprovedEventData,
    WalletRevokedEventData,
    TokensMintedEventData,
    TokensTransferredEventData,
} from './types/indexer.types';

/**
 * Event Indexer for Solana Gated Token Program
 * Listens to program events and stores them in the database
 */
export class EventIndexer extends EventEmitter {
    private connection: Connection;
    private programId: PublicKey;
    private isRunning: boolean;
    private subscriptionId: number | null;
    public lastProcessedSlot: number;
    private reconnectAttempts: number;
    private maxReconnectAttempts: number;
    private reconnectDelay: number;
    private healthCheckInterval: NodeJS.Timeout | null;

    constructor(connection: Connection, programId: string) {
        super();
        this.connection = connection;
        this.programId = new PublicKey(programId);
        this.isRunning = false;
        this.subscriptionId = null;
        this.lastProcessedSlot = 0;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000; // 5 seconds
        this.healthCheckInterval = null;
    }

    /**
     * Start listening to program events
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('Indexer is already running');
            return;
        }

        this.isRunning = true;
        logger.info('Starting event indexer', { programId: this.programId.toString() });

        try {
            // Test connection health before subscribing
            await this.checkConnectionHealth();

            // Subscribe to program logs
            this.subscriptionId = this.connection.onLogs(
                this.programId,
                async (logs: Logs, context: Context) => {
                    try {
                        await this.processLogs(logs, context);
                        // Reset reconnect attempts on successful processing
                        this.reconnectAttempts = 0;
                    } catch (error) {
                        logger.error('Error processing logs', error as Error);
                        this.emit('error', error);

                        // Attempt reconnection if processing fails repeatedly
                        await this.handleConnectionError(error as Error);
                    }
                },
                'confirmed'
            );

            logger.info('Indexer started successfully', {
                subscriptionId: this.subscriptionId,
                programId: this.programId.toString()
            });

            // Start periodic health checks
            this.startHealthChecks();

            this.emit('started');

        } catch (error) {
            logger.error('Failed to start indexer', error as Error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Check if the RPC connection is healthy
     */
    private async checkConnectionHealth(): Promise<boolean> {
        try {
            const slot = await this.connection.getSlot('confirmed');
            logger.debug('Connection health check passed', { currentSlot: slot });
            return true;
        } catch (error) {
            logger.error('Connection health check failed', error as Error);
            return false;
        }
    }

    /**
     * Start periodic health checks
     */
    private startHealthChecks(): void {
        // Check every 30 seconds
        this.healthCheckInterval = setInterval(async () => {
            const isHealthy = await this.checkConnectionHealth();

            if (!isHealthy && this.isRunning) {
                logger.warn('Health check failed, attempting to reconnect...');
                await this.reconnect();
            }
        }, 30000);
    }

    /**
     * Handle connection errors and attempt reconnection
     */
    private async handleConnectionError(error: Error): Promise<void> {
        logger.error('Connection error detected', error);

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            logger.info(`Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
            await this.reconnect();
        } else {
            logger.error('Max reconnection attempts reached, stopping indexer');
            this.emit('max_reconnects_reached');
            await this.stop();
        }
    }

    /**
     * Reconnect to the RPC endpoint
     */
    private async reconnect(): Promise<void> {
        logger.info('Reconnecting to Solana RPC...');

        try {
            // Stop current subscription
            if (this.subscriptionId !== null) {
                await this.connection.removeOnLogsListener(this.subscriptionId);
                this.subscriptionId = null;
            }

            // Test connection
            const isHealthy = await this.checkConnectionHealth();

            if (!isHealthy) {
                throw new Error('Connection health check failed after reconnect attempt');
            }

            // Resubscribe to logs
            this.subscriptionId = this.connection.onLogs(
                this.programId,
                async (logs: Logs, context: Context) => {
                    try {
                        await this.processLogs(logs, context);
                        this.reconnectAttempts = 0;
                    } catch (error) {
                        logger.error('Error processing logs', error as Error);
                        this.emit('error', error);
                    }
                },
                'confirmed'
            );

            logger.info('Reconnected successfully', { subscriptionId: this.subscriptionId });
            this.reconnectAttempts = 0;
            this.emit('reconnected');

        } catch (error) {
            logger.error('Reconnection failed', error as Error);
            throw error;
        }
    }

    /**
     * Stop listening to events
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;

        // Clear health check interval
        if (this.healthCheckInterval !== null) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        // Remove subscription
        if (this.subscriptionId !== null) {
            await this.connection.removeOnLogsListener(this.subscriptionId);
            this.subscriptionId = null;
        }

        logger.info('Indexer stopped');
        this.emit('stopped');
    }

    /**
     * Get indexer status
     */
    getStatus(): {
        isRunning: boolean;
        lastProcessedSlot: number;
        reconnectAttempts: number;
        subscriptionActive: boolean;
    } {
        return {
            isRunning: this.isRunning,
            lastProcessedSlot: this.lastProcessedSlot,
            reconnectAttempts: this.reconnectAttempts,
            subscriptionActive: this.subscriptionId !== null,
        };
    }

    /**
     * Process transaction logs and extract events
     */
    private async processLogs(logs: Logs, context: Context): Promise<void> {
        const signature = logs.signature;
        const slot = context.slot;

        logger.debug('Processing transaction', { signature, slot });

        // Fetch full transaction details
        const tx = await this.connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        });

        if (!tx) {
            logger.warn('Transaction not found', { signature });
            return;
        }

        // Parse events from logs
        const events = this.parseEventsFromLogs(logs.logs);

        for (const event of events) {
            await this.processEvent(event, signature, slot, tx.blockTime ?? null);
        }

        this.lastProcessedSlot = slot;
    }

    /**
     * Parse Anchor events from transaction logs
     */
    private parseEventsFromLogs(logs: string[]): ParsedEvent[] {
        const events: ParsedEvent[] = [];
        const EVENT_PREFIX = 'Program data: ';

        for (const log of logs) {
            if (log.startsWith(EVENT_PREFIX)) {
                try {
                    // Extract base64 encoded event data
                    const eventData = log.slice(EVENT_PREFIX.length);
                    const decoded = Buffer.from(eventData, 'base64');

                    // First 8 bytes are the event discriminator
                    const discriminator = decoded.slice(0, 8);
                    const data = decoded.slice(8);

                    // Parse event based on discriminator
                    const event = this.parseEvent(discriminator, data);
                    if (event) {
                        events.push(event);
                    }
                } catch (error) {
                    logger.debug('Failed to parse event', { error: (error as Error).message });
                }
            }
        }

        return events;
    }

    /**
     * Parse event data based on discriminator
     * Note: This is a simplified parser. In production, use the IDL for proper parsing.
     */
    private parseEvent(discriminator: Buffer, data: Buffer): ParsedEvent | null {
        // Event discriminators (computed from event name)
        // These are simplified - in production, use anchor.BorshEventCoder
        const discriminatorStr = discriminator.toString('hex');

        try {
            // For now, we'll extract events by pattern matching in logs
            // In production, implement proper Borsh deserialization using the IDL
            return {
                discriminator: discriminatorStr,
                data: data,
                raw: true,
            };
        } catch (error) {
            logger.debug('Failed to parse event data', { error: (error as Error).message });
            return null;
        }
    }

    /**
     * Process a parsed event and store it in the database
     */
    private async processEvent(
        event: ParsedEvent,
        signature: string,
        slot: number,
        blockTime: number | null
    ): Promise<void> {
        // This is a placeholder - proper event parsing requires the program IDL
        logger.debug('Event detected', { signature, slot, event });

        // Emit event for real-time subscribers
        this.emit('event', { event, signature, slot, blockTime });
    }

    /**
     * Process TokenInitialized event
     */
    async processTokenInitializedEvent(
        eventData: TokenInitializedEventData,
        _signature: string,
        _slot: number,
        _blockTime: number | null
    ): Promise<any> {
        const { mint, symbol, name, decimals } = eventData;

        logger.info('Processing TokenInitialized event', { mint, symbol, name });

        // Store security in database
        const { data, error } = await supabase
            .from('securities')
            .insert([
                {
                    mint_address: mint,
                    symbol: symbol,
                    name: name,
                    decimals: decimals,
                    total_supply: 0,
                    current_supply: 0,
                    program_id: this.programId.toString(),
                    is_active: true,
                },
            ])
            .select()
            .single();

        if (error) {
            logger.error('Failed to store security', error, { mint });
            throw error;
        }

        logger.info('Security created', { id: data.id, mint, symbol });
        this.emit('token_initialized', data);
        return data;
    }

    /**
     * Process WalletApproved event
     */
    async processWalletApprovedEvent(
        eventData: WalletApprovedEventData,
        _signature: string,
        _slot: number,
        _blockTime: number | null
    ): Promise<any> {
        const { token_mint, wallet, approved_by, timestamp } = eventData;

        logger.info('Processing WalletApproved event', { token_mint, wallet });

        // Get security_id from mint address
        const { data: security } = await supabase
            .from('securities')
            .select('id')
            .eq('mint_address', token_mint)
            .single();

        if (!security) {
            logger.warn('Security not found for mint', { token_mint });
            return;
        }

        // Store allowlist entry
        const { data, error } = await supabase
            .from('allowlist')
            .upsert(
                [
                    {
                        security_id: security.id,
                        wallet_address: wallet,
                        status: 'approved',
                        approved_by: approved_by,
                        approved_at: new Date(timestamp * 1000).toISOString(),
                    },
                ],
                {
                    onConflict: 'security_id,wallet_address',
                }
            )
            .select()
            .single();

        if (error) {
            logger.error('Failed to store allowlist entry', error);
            throw error;
        }

        logger.info('Wallet approved', { wallet, security_id: security.id });
        this.emit('wallet_approved', data);

        // Broadcast to WebSocket clients
        broadcastAllowlistUpdate({
            event: 'approved',
            security_id: security.id,
            wallet_address: wallet,
            status: 'approved',
        });

        return data;
    }

    /**
     * Process WalletRevoked event
     */
    async processWalletRevokedEvent(
        eventData: WalletRevokedEventData,
        _signature: string,
        _slot: number,
        _blockTime: number | null
    ): Promise<any> {
        const { token_mint, wallet, timestamp } = eventData;

        logger.info('Processing WalletRevoked event', { token_mint, wallet });

        // Get security_id from mint address
        const { data: security } = await supabase
            .from('securities')
            .select('id')
            .eq('mint_address', token_mint)
            .single();

        if (!security) {
            logger.warn('Security not found for mint', { token_mint });
            return;
        }

        // Update allowlist entry
        const { data, error } = await supabase
            .from('allowlist')
            .update({
                status: 'revoked',
                revoked_at: new Date(timestamp * 1000).toISOString(),
            })
            .eq('security_id', security.id)
            .eq('wallet_address', wallet)
            .select()
            .single();

        if (error) {
            logger.error('Failed to update allowlist entry', error);
            throw error;
        }

        logger.info('Wallet revoked', { wallet, security_id: security.id });
        this.emit('wallet_revoked', data);

        // Broadcast to WebSocket clients
        broadcastAllowlistUpdate({
            event: 'revoked',
            security_id: security.id,
            wallet_address: wallet,
            status: 'revoked',
        });

        return data;
    }

    /**
     * Process TokensMinted event
     */
    async processTokensMintedEvent(
        eventData: TokensMintedEventData,
        _signature: string,
        slot: number,
        _blockTime: number | null
    ): Promise<any> {
        const { token_mint, recipient, amount, new_supply } = eventData;

        logger.info('Processing TokensMinted event', { token_mint, recipient, amount });

        // Get security_id from mint address
        const { data: security } = await supabase
            .from('securities')
            .select('id')
            .eq('mint_address', token_mint)
            .single();

        if (!security) {
            logger.warn('Security not found for mint', { token_mint });
            return;
        }

        // Update security total supply
        await supabase.from('securities').update({ current_supply: new_supply, total_supply: new_supply }).eq('id', security.id);

        // Update token balance using the update_balance database function for proper increment
        const balanceResult = await supabase.rpc('update_balance', {
            p_security_id: security.id,
            p_wallet: recipient,
            p_amount: amount,
            p_block_height: slot,
            p_slot: slot,
        });

        if (balanceResult.error) {
            logger.error('Failed to update token balance', balanceResult.error as any);
            throw balanceResult.error;
        }

        // Get the updated balance for return value
        const { data: balance, error } = await supabase
            .from('token_balances')
            .select('*')
            .eq('security_id', security.id)
            .eq('wallet_address', recipient)
            .single();

        if (error) {
            logger.error('Failed to fetch updated balance', error);
        }

        logger.info('Tokens minted', { recipient, amount, new_supply });
        this.emit('tokens_minted', { security_id: security.id, recipient, amount, new_supply });

        // Broadcast to WebSocket clients
        broadcastTokenMinted({
            security_id: security.id,
            mint_address: token_mint,
            recipient,
            amount,
            new_supply,
            balance: balance?.balance || amount,
        });

        return balance;
    }

    /**
     * Process TokensTransferred event
     */
    async processTokensTransferredEvent(
        eventData: TokensTransferredEventData,
        signature: string,
        slot: number,
        blockTime: number | null
    ): Promise<any> {
        const { token_mint, from, to, amount } = eventData;

        logger.info('Processing TokensTransferred event', { token_mint, from, to, amount });

        // Get security_id from mint address
        const { data: security } = await supabase
            .from('securities')
            .select('id')
            .eq('mint_address', token_mint)
            .single();

        if (!security) {
            logger.warn('Security not found for mint', { token_mint });
            return;
        }

        // Store transfer record
        const { data: transfer, error: transferError } = await supabase
            .from('transfers')
            .insert([
                {
                    security_id: security.id,
                    transaction_signature: signature,
                    from_wallet: from,
                    to_wallet: to,
                    amount: amount,
                    block_height: slot,
                    slot: slot,
                    block_time: blockTime ? new Date(blockTime * 1000).toISOString() : null,
                    status: 'confirmed',
                },
            ])
            .select()
            .single();

        if (transferError) {
            logger.error('Failed to store transfer', transferError);
        }

        // Update sender balance (decrease)
        const senderResult = await supabase.rpc('update_balance', {
            p_security_id: security.id,
            p_wallet: from,
            p_amount: -amount,
            p_block_height: slot,
            p_slot: slot,
        });

        if (senderResult.error) {
            logger.error('Failed to update sender balance', senderResult.error as any);
        }

        // Update recipient balance (increase)
        const recipientResult = await supabase.rpc('update_balance', {
            p_security_id: security.id,
            p_wallet: to,
            p_amount: amount,
            p_block_height: slot,
            p_slot: slot,
        });

        if (recipientResult.error) {
            logger.error('Failed to update recipient balance', recipientResult.error as any);
        }

        logger.info('Transfer recorded', { from, to, amount });
        this.emit('tokens_transferred', { security_id: security.id, from, to, amount });

        // Broadcast to WebSocket clients
        broadcastTokenTransferred({
            security_id: security.id,
            mint_address: token_mint,
            from,
            to,
            amount,
            signature,
            block_height: slot,
        });

        return transfer;
    }

    /**
     * Backfill historical events for a token mint
     */
    async backfillEvents(mintAddress: string, fromSlot: number = 0): Promise<void> {
        logger.info('Backfilling events', { mintAddress, fromSlot });

        // Validate mint address format
        new PublicKey(mintAddress);

        // Get all signatures for the program related to this mint
        const signatures: ConfirmedSignatureInfo[] = await this.connection.getSignaturesForAddress(
            this.programId,
            { limit: 1000 },
            'confirmed'
        );

        logger.info('Found signatures', { count: signatures.length });

        for (const sig of signatures) {
            if (sig.slot < fromSlot) continue;

            try {
                const tx = await this.connection.getTransaction(sig.signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0,
                });

                if (tx && tx.meta && tx.meta.logMessages) {
                    const logs: Logs = {
                        signature: sig.signature,
                        logs: tx.meta.logMessages,
                        err: tx.meta.err,
                    };
                    await this.processLogs(logs, { slot: sig.slot });
                }
            } catch (error) {
                logger.error('Failed to process historical transaction', error as Error, {
                    signature: sig.signature,
                });
            }
        }

        logger.info('Backfill complete', { mintAddress, processedSlot: this.lastProcessedSlot });
    }
}

/**
 * Create and start an indexer instance
 */
export async function createIndexer(
    connection: Connection,
    programId: string
): Promise<EventIndexer> {
    const indexer = new EventIndexer(connection, programId);
    return indexer;
}

