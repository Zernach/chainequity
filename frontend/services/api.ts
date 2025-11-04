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

    async getTokenInfo(tokenMint: string) {
        return this.tokens.getTokenInfo(tokenMint);
    }

    async getBalance(tokenMint: string, walletAddress: string) {
        return this.tokens.getBalance(tokenMint, walletAddress);
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

