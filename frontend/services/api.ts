/**
 * Centralized API client for ChainEquity backend
 * Refactored to use modular handlers for better maintainability
 */

import {
    API_BASE_URL,
    HealthHandler,
    UsersHandler,
    TokenHandler,
    AllowlistHandler,
    MintingHandler,
    TransfersHandler,
    CorporateActionsHandler,
    CapTableHandler,
} from './handlers';

import type {
    CreateUserRequest,
    ApproveWalletRequest,
    MintTokenRequest,
    StockSplitRequest,
    ChangeSymbolRequest,
} from './types';

/**
 * Unified API Client
 * Delegates to specialized handlers while maintaining a single interface
 */
class APIClient {
    private health: HealthHandler;
    private users: UsersHandler;
    private tokens: TokenHandler;
    private allowlist: AllowlistHandler;
    private minting: MintingHandler;
    private transfers: TransfersHandler;
    private corporateActions: CorporateActionsHandler;
    private capTable: CapTableHandler;

    constructor(baseURL: string = API_BASE_URL) {
        // Initialize all handlers with the same base URL
        this.health = new HealthHandler(baseURL);
        this.users = new UsersHandler(baseURL);
        this.tokens = new TokenHandler(baseURL);
        this.allowlist = new AllowlistHandler(baseURL);
        this.minting = new MintingHandler(baseURL);
        this.transfers = new TransfersHandler(baseURL);
        this.corporateActions = new CorporateActionsHandler(baseURL);
        this.capTable = new CapTableHandler(baseURL);
    }

    /**
     * Set the access token for authenticated requests
     * Propagates to all handlers that need authentication
     */
    setAccessToken(token: string | null) {
        this.users.setAccessToken(token);
        this.tokens.setAccessToken(token);
        this.allowlist.setAccessToken(token);
        this.minting.setAccessToken(token);
        this.transfers.setAccessToken(token);
        this.corporateActions.setAccessToken(token);
        this.capTable.setAccessToken(token);
    }

    /**
     * Get the current access token
     */
    getAccessToken(): string | null {
        return this.allowlist.getAccessToken();
    }

    // ==================== Health ====================
    async checkHealth() {
        return this.health.health();
    }

    // ==================== Users ====================
    async getUsers() {
        return this.users.getUsers();
    }

    async createUser(data: CreateUserRequest) {
        return this.users.createUser(data);
    }

    // ==================== Tokens ====================
    async initializeToken(symbol: string, name: string, decimals: number = 9) {
        return this.tokens.initializeToken(symbol, name, decimals);
    }

    async getAllSecurities() {
        return this.tokens.getAllSecurities();
    }

    async getSecurityByMint(mintAddress: string) {
        return this.tokens.getSecurityByMint(mintAddress);
    }

    async getTokenInfo(tokenMint: string) {
        return this.tokens.getTokenInfo(tokenMint);
    }

    async getBalance(tokenMint: string, walletAddress: string) {
        return this.tokens.getBalance(tokenMint, walletAddress);
    }

    async getWalletHoldings(walletAddress: string) {
        return this.tokens.getWalletHoldings(walletAddress);
    }

    // ==================== Allowlist ====================
    async approveWallet(data: ApproveWalletRequest) {
        return this.allowlist.approveWallet(data);
    }

    async revokeWallet(tokenMint: string, walletAddress: string) {
        return this.allowlist.revokeWallet(tokenMint, walletAddress);
    }

    async getAllowlist(tokenMint: string) {
        return this.allowlist.getAllowlist(tokenMint);
    }

    async checkAllowlistStatus(tokenMint: string, walletAddress: string) {
        return this.allowlist.checkAllowlistStatus(tokenMint, walletAddress);
    }

    // ==================== Minting ====================
    async mintTokens(data: MintTokenRequest) {
        return this.minting.mintTokens(data);
    }

    // ==================== Transfers ====================
    async getTransferHistory(tokenMint: string) {
        return this.transfers.getTransferHistory(tokenMint);
    }

    // ==================== Corporate Actions ====================
    async executeStockSplit(data: StockSplitRequest) {
        return this.corporateActions.executeStockSplit(data);
    }

    async changeSymbol(data: ChangeSymbolRequest) {
        return this.corporateActions.changeSymbol(data);
    }

    // ==================== Cap Table ====================
    async getCapTable(tokenMint: string, blockHeight?: number) {
        return this.capTable.getCapTable(tokenMint, blockHeight);
    }

    async exportCapTable(tokenMint: string, format: 'csv' | 'json') {
        return this.capTable.exportCapTable(tokenMint, format);
    }
}

export const api = new APIClient();
export { API_BASE_URL };

