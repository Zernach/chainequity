/**
 * Centralized API client for ChainEquity backend
 */

import type {
    CreateUserRequest,
    CreateUserResponse,
    GetUsersResponse,
    ApproveWalletRequest,
    ApproveWalletResponse,
    MintTokenRequest,
    MintTokenResponse,
    TransferHistoryResponse,
    StockSplitRequest,
    StockSplitResponse,
    ChangeSymbolRequest,
    ChangeSymbolResponse,
    CapTableResponse,
    ExportCapTableRequest,
    TokenMetadata,
    TokenBalance,
    AllowlistEntry,
} from './types';

// Configuration - can be overridden via environment variables
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class APIClient {
    private baseURL: string;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    private async request<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // Health check
    async health() {
        return this.request<{ status: string; message: string; timestamp: string }>(
            '/health'
        );
    }

    // User endpoints
    async getUsers() {
        return this.request<GetUsersResponse>('/users');
    }

    async createUser(data: CreateUserRequest) {
        return this.request<CreateUserResponse>('/users', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Token admin endpoints
    async initializeToken(symbol: string, name: string, decimals: number = 9) {
        return this.request<{ success: boolean; mint: string; signature: string }>(
            '/admin/token/initialize',
            {
                method: 'POST',
                body: JSON.stringify({ symbol, name, decimals }),
            }
        );
    }

    async getTokenInfo(tokenMint: string) {
        return this.request<{ success: boolean; token: TokenMetadata }>(
            `/token/${tokenMint}/info`
        );
    }

    // Allowlist endpoints
    async approveWallet(data: ApproveWalletRequest) {
        return this.request<ApproveWalletResponse>('/admin/allowlist/approve', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async revokeWallet(tokenMint: string, walletAddress: string) {
        return this.request<{ success: boolean }>(
            '/admin/allowlist/revoke',
            {
                method: 'POST',
                body: JSON.stringify({
                    token_mint: tokenMint,
                    wallet_address: walletAddress,
                }),
            }
        );
    }

    async getAllowlist(tokenMint: string) {
        return this.request<{ success: boolean; entries: AllowlistEntry[] }>(
            `/admin/allowlist/${tokenMint}`
        );
    }

    async checkAllowlistStatus(tokenMint: string, walletAddress: string) {
        return this.request<{ success: boolean; entry: AllowlistEntry }>(
            `/allowlist/${tokenMint}/${walletAddress}`
        );
    }

    // Minting endpoints
    async mintTokens(data: MintTokenRequest) {
        return this.request<MintTokenResponse>('/admin/mint', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Balance endpoints
    async getBalance(tokenMint: string, walletAddress: string) {
        return this.request<{ success: boolean; balance: TokenBalance }>(
            `/token/${tokenMint}/balance/${walletAddress}`
        );
    }

    // Transfer endpoints
    async getTransferHistory(tokenMint: string) {
        return this.request<TransferHistoryResponse>(
            `/admin/transfers/${tokenMint}`
        );
    }

    // Corporate action endpoints
    async executeStockSplit(data: StockSplitRequest) {
        return this.request<StockSplitResponse>(
            '/admin/corporate-actions/split',
            {
                method: 'POST',
                body: JSON.stringify(data),
            }
        );
    }

    async changeSymbol(data: ChangeSymbolRequest) {
        return this.request<ChangeSymbolResponse>(
            '/admin/corporate-actions/change-symbol',
            {
                method: 'POST',
                body: JSON.stringify(data),
            }
        );
    }

    // Cap table endpoints
    async getCapTable(tokenMint: string, blockHeight?: number) {
        const endpoint = blockHeight
            ? `/cap-table/${tokenMint}/${blockHeight}`
            : `/cap-table/${tokenMint}`;
        return this.request<CapTableResponse>(endpoint);
    }

    async exportCapTable(tokenMint: string, format: 'csv' | 'json') {
        return this.request<{ success: boolean; data: string }>(
            `/cap-table/${tokenMint}/export`,
            {
                method: 'POST',
                body: JSON.stringify({ format }),
            }
        );
    }
}

export const api = new APIClient();

