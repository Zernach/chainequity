/**
 * WebSocket message types
 */

export interface WebSocketMessage {
    type: string;
    data?: any;
    timestamp: string;
}

export interface ConnectionMessage extends WebSocketMessage {
    type: 'connection';
    message: string;
}

export interface EchoMessage extends WebSocketMessage {
    type: 'echo';
}

export interface ErrorMessage extends WebSocketMessage {
    type: 'error';
    message: string;
}

export interface SolanaTransactionMessage extends WebSocketMessage {
    type: 'solana_transaction';
}

export interface AllowlistUpdateMessage extends WebSocketMessage {
    type: 'allowlist_updated';
    data: {
        event: string;
        data: any;
    };
}

export interface TokenMintedMessage extends WebSocketMessage {
    type: 'token_minted';
}

export interface TokenTransferredMessage extends WebSocketMessage {
    type: 'token_transferred';
}

export interface CapTableUpdateMessage extends WebSocketMessage {
    type: 'cap_table_updated';
    data: {
        event: string;
        data: any;
    };
}

export interface CorporateActionMessage extends WebSocketMessage {
    type: 'corporate_action';
}

export interface DatabaseChangeMessage extends WebSocketMessage {
    type: 'database_change';
    event: string;
    table: string;
}

