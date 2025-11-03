/**
 * Cap table types
 */

export interface CapTableHolder {
    wallet_address: string;
    shares: number;
    percentage: number;
    last_updated: string;
    block_height: number;
    allowlist_status?: string;
    approved_at?: string | null;
}

export interface TokenInfo {
    mint_address: string;
    symbol: string;
    name: string;
    decimals: number;
    total_supply: number;
    program_id: string;
}

export interface CapTableSnapshot {
    block_height: number | null;
    timestamp: string;
    is_historical: boolean;
}

export interface CapTableSummary {
    total_holders: number;
    total_shares: number;
    percentage_distributed: number;
}

export interface CapTableData {
    token: TokenInfo;
    snapshot: CapTableSnapshot;
    summary: CapTableSummary;
    holders: CapTableHolder[];
}

export interface TransferHistoryOptions {
    limit?: number;
    offset?: number;
    fromWallet?: string | null;
    toWallet?: string | null;
}

export interface TransferHistoryResult {
    transfers: any[];
    total: number;
    limit: number;
    offset: number;
}

export interface ConcentrationMetrics {
    top_1_holders: number;
    top_5_holders: number;
    top_10_holders: number;
    gini_coefficient: number;
    interpretation: string;
}

