/**
 * TypeScript interfaces for API requests and responses
 */

// User types
export interface User {
    id: string;
    name: string;
    wallet_address?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateUserRequest {
    name: string;
    wallet_address?: string;
}

export interface CreateUserResponse {
    success: boolean;
    user?: User;
    error?: string;
}

export interface GetUsersResponse {
    success: boolean;
    users: User[];
    count: number;
    error?: string;
}

// Token types
export interface TokenMetadata {
    mint: string;
    symbol: string;
    name: string;
    decimals: number;
    supply: string;
    created_at: string;
}

export interface TokenBalance {
    wallet: string;
    balance: string;
    ownership_percentage: number;
}

// Allowlist types
export interface AllowlistEntry {
    wallet_address: string;
    status: 'approved' | 'pending' | 'rejected';
    approved_at?: string;
    approved_by?: string;
}

export interface ApproveWalletRequest {
    token_mint: string;
    wallet_address: string;
}

export interface ApproveWalletResponse {
    success: boolean;
    entry?: AllowlistEntry;
    error?: string;
}

// Minting types
export interface MintTokenRequest {
    token_mint: string;
    wallet_address: string;
    amount: string;
}

export interface MintTokenResponse {
    success: boolean;
    signature?: string;
    balance?: string;
    error?: string;
}

// Transfer types
export interface Transfer {
    signature: string;
    from: string;
    to: string;
    amount: string;
    block_height: number;
    timestamp: string;
    status: 'pending' | 'confirmed' | 'failed';
}

export interface TransferHistoryResponse {
    success: boolean;
    transfers: Transfer[];
    count: number;
    error?: string;
}

// Corporate action types
export interface StockSplitRequest {
    token_mint: string;
    split_ratio: number;
}

export interface StockSplitResponse {
    success: boolean;
    old_mint?: string;
    new_mint?: string;
    signature?: string;
    error?: string;
}

export interface ChangeSymbolRequest {
    token_mint: string;
    new_symbol: string;
    new_name: string;
}

export interface ChangeSymbolResponse {
    success: boolean;
    signature?: string;
    error?: string;
}

// Cap table types
export interface CapTableEntry {
    wallet: string;
    balance: string;
    ownership_percentage: number;
}

export interface CapTableResponse {
    success: boolean;
    token_mint: string;
    block_height: number;
    total_supply: string;
    entries: CapTableEntry[];
    timestamp: string;
    error?: string;
}

export interface ExportCapTableRequest {
    format: 'csv' | 'json';
}

// WebSocket event types
export interface WebSocketEvent {
    type: string;
    data?: any;
    timestamp: string;
}

export interface AllowlistUpdatedEvent extends WebSocketEvent {
    type: 'allowlist_updated';
    data: {
        token_mint: string;
        wallet_address: string;
        status: 'approved' | 'revoked';
    };
}

export interface TokenMintedEvent extends WebSocketEvent {
    type: 'token_minted';
    data: {
        token_mint: string;
        wallet_address: string;
        amount: string;
        signature: string;
    };
}

export interface TokenTransferredEvent extends WebSocketEvent {
    type: 'token_transferred';
    data: {
        token_mint: string;
        from: string;
        to: string;
        amount: string;
        signature: string;
    };
}

export interface CorporateActionEvent extends WebSocketEvent {
    type: 'corporate_action';
    data: {
        action_type: 'split' | 'symbol_change';
        token_mint: string;
        details: any;
    };
}

export interface CapTableUpdatedEvent extends WebSocketEvent {
    type: 'cap_table_updated';
    data: {
        token_mint: string;
        block_height: number;
    };
}

// API error types
export interface APIError {
    success: false;
    error: string;
    code?: string;
    details?: any;
}

