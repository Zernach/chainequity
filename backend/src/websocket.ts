import WebSocket, { Server as WebSocketServer } from 'ws';
import { supabase } from './db';
import { WebSocketMessage, DatabaseChangeMessage } from './types/websocket.types';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

/**
 * Initialize WebSocket server
 */
export function initWebSocketServer(port: number): WebSocketServer {
    wss = new WebSocketServer({ port });

    console.log(`WebSocket server running on port ${port}`);

    wss.on('connection', (ws: WebSocket) => {
        console.log('New WebSocket client connected');
        clients.add(ws);

        // Send welcome message
        ws.send(
            JSON.stringify({
                type: 'connection',
                message: 'Connected to ChainEquity WebSocket server',
                timestamp: new Date().toISOString(),
            })
        );

        // Handle incoming messages (echo functionality)
        ws.on('message', (message: WebSocket.Data) => {
            console.log('Received:', message.toString());

            try {
                const data = JSON.parse(message.toString());

                // Echo message back
                ws.send(
                    JSON.stringify({
                        type: 'echo',
                        data: data,
                        timestamp: new Date().toISOString(),
                    })
                );
            } catch (error) {
                ws.send(
                    JSON.stringify({
                        type: 'error',
                        message: 'Invalid JSON',
                    })
                );
            }
        });

        // Handle client disconnect
        ws.on('close', () => {
            console.log('WebSocket client disconnected');
            clients.delete(ws);
        });

        // Handle errors
        ws.on('error', (error: Error) => {
            console.error('WebSocket error:', error);
            clients.delete(ws);
        });
    });

    // Set up Supabase real-time subscription for database changes
    setupDatabaseSubscription();

    return wss;
}

/**
 * Broadcast message to all connected clients
 */
export function broadcast(data: WebSocketMessage): void {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Broadcast Solana transaction update
 */
export function broadcastSolanaTransaction(txData: any): void {
    broadcast({
        type: 'solana_transaction',
        data: txData,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Broadcast allowlist update
 */
export function broadcastAllowlistUpdate(data: any): void {
    broadcast({
        type: 'allowlist_updated',
        data: data,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Broadcast token minting event
 */
export function broadcastTokenMinted(data: any): void {
    broadcast({
        type: 'token_minted',
        data: data,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Broadcast token transfer event
 */
export function broadcastTokenTransferred(data: any): void {
    broadcast({
        type: 'token_transferred',
        data: data,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Broadcast cap table update
 */
export function broadcastCapTableUpdate(data: any): void {
    broadcast({
        type: 'cap_table_updated',
        data: data,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Broadcast corporate action event
 */
export function broadcastCorporateAction(data: any): void {
    broadcast({
        type: 'corporate_action',
        data: data,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Setup Supabase real-time subscription for database changes
 */
function setupDatabaseSubscription(): void {
    // Subscribe to users table changes
    supabase
        .channel('users-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'users',
            },
            (payload) => {
                console.log('Users table change detected:', payload);
                const message: DatabaseChangeMessage = {
                    type: 'database_change',
                    event: payload.eventType,
                    table: 'users',
                    data: payload.new || payload.old,
                    timestamp: new Date().toISOString(),
                };
                broadcast(message);
            }
        )
        .subscribe();

    // Subscribe to allowlist changes
    supabase
        .channel('allowlist-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'allowlist',
            },
            (payload) => {
                console.log('Allowlist change detected:', payload);
                broadcastAllowlistUpdate({
                    event: payload.eventType,
                    data: payload.new || payload.old,
                });
            }
        )
        .subscribe();

    // Subscribe to token_balances changes
    supabase
        .channel('balances-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'token_balances',
            },
            (payload) => {
                console.log('Token balance change detected:', payload);
                broadcastCapTableUpdate({
                    event: payload.eventType,
                    data: payload.new || payload.old,
                });
            }
        )
        .subscribe();

    // Subscribe to transfers
    supabase
        .channel('transfers-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'transfers',
            },
            (payload) => {
                console.log('New transfer detected:', payload);
                broadcastTokenTransferred(payload.new);
            }
        )
        .subscribe();

    // Subscribe to corporate actions
    supabase
        .channel('corporate-actions-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'corporate_actions',
            },
            (payload) => {
                console.log('Corporate action detected:', payload);
                broadcastCorporateAction(payload.new);
            }
        )
        .subscribe();

    console.log(
        'Subscribed to database changes (users, allowlist, balances, transfers, corporate_actions)'
    );
}

