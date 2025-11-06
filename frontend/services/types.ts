/**
 * TypeScript interfaces for API requests and responses
 */

// User types
export type UserRole = 'admin' | 'issuer' | 'investor' | 'viewer';

export interface User {
    id: string;
    name: string;
    wallet_address?: string;
    created_at: string;
    updated_at: string;
}

// Auth user types (extended with authentication fields)
export interface AuthUser {
    id: string;
    auth_user_id: string;
    email: string | null;
    name: string;
    role: UserRole;
    wallet_address: string | null;
    email_verified: boolean;
    wallet_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface Session {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
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
    mint: string;
    wallet: string;
    amount: string;
    decimals: number;
    symbol: string;
    name: string;
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
    transaction_signature: string;
    from_wallet: string;
    to_wallet: string;
    amount: number;
    block_height: number;
    block_time: string;
    status: 'pending' | 'confirmed' | 'failed';
}

export interface TransferHistoryResponse {
    success: boolean;
    data: {
        transfers: Transfer[];
        total: number;
        limit: number;
        offset: number;
    };
    error?: string;
}

// Corporate action types
export interface StockSplitRequest {
    token_mint: string;
    split_ratio: number;
    new_symbol: string;
    new_name: string;
}

export interface StockSplitResponse {
    success: boolean;
    old_mint?: string;
    new_mint?: string;
    signature?: string;
    holders_transitioned?: number;
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

// Authentication request/response types (wallet-only)
// Note: SignupRequest and LoginRequest are deprecated - use WalletLoginRequest instead

export interface LinkWalletRequest {
    wallet_address: string;
    signature: string;
    message: string;
}

export interface WalletLoginRequest {
    wallet_address: string;
    signature: string;
    message: string;
    email?: string;
    name?: string;
}

export interface AuthResponse {
    success: boolean;
    user?: AuthUser;
    session?: Session;
    message?: string;
    isNewUser?: boolean;
    error?: string;
}

export interface VerifyWalletRequest {
    wallet_address: string;
    signature: string;
    message: string;
}

export interface VerifyWalletResponse {
    success: boolean;
    verification?: {
        valid: boolean;
        wallet_address: string;
        error?: string;
    };
    message?: string;
    error?: string;
}

// API error types
export interface APIError {
    success: false;
    error: string;
    code?: string;
    details?: any;
}

