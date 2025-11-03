/**
 * Database types for Supabase tables
 */

export interface User {
    id: string;
    name: string;
    wallet_address: string | null;
    created_at: string;
    updated_at: string;
}

export interface Security {
    id: string;
    mint_address: string;
    symbol: string;
    name: string;
    decimals: number;
    total_supply: number;
    current_supply: number;
    program_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Allowlist {
    id: string;
    security_id: string;
    wallet_address: string;
    status: 'pending' | 'approved' | 'revoked';
    approved_by: string | null;
    approved_at: string | null;
    revoked_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface TokenBalance {
    id: string;
    security_id: string;
    wallet_address: string;
    balance: number;
    block_height: number;
    slot: number;
    updated_at: string;
    created_at: string;
}

export interface Transfer {
    id: string;
    security_id: string;
    transaction_signature: string;
    from_wallet: string;
    to_wallet: string;
    amount: number;
    block_height: number;
    slot: number;
    block_time: string | null;
    status: 'pending' | 'confirmed' | 'failed';
    created_at: string;
}

export interface CapTableSnapshot {
    id: string;
    security_id: string;
    block_height: number;
    slot: number;
    total_supply: number;
    holder_count: number;
    snapshot_data: any;
    created_at: string;
}

export interface CorporateAction {
    id: string;
    security_id: string;
    action_type: 'split' | 'reverse_split' | 'dividend' | 'rights_issue' | 'merger';
    status: 'pending' | 'completed' | 'failed';
    parameters: any;
    transaction_signature: string | null;
    executed_at: string | null;
    created_at: string;
    updated_at: string;
}

// Database query response types
export interface DatabaseResponse<T> {
    data: T | null;
    error: any | null;
}

export interface DatabaseListResponse<T> {
    data: T[] | null;
    error: any | null;
    count?: number | null;
}

