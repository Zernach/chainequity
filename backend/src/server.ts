import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateRequest, requireRole } from './auth';
import { initWebSocketServer } from './websocket';
import * as handlers from './handlers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        message: 'ChainEquity backend is running',
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================
app.post('/auth/signup', handlers.signup);
app.post('/auth/login', handlers.login);
app.post('/auth/logout', authenticateRequest, handlers.logout);
app.post('/auth/request-nonce', handlers.requestNonce);
app.get('/auth/wallet-message/:nonce', handlers.getWalletMessage);
app.get('/auth/me', authenticateRequest, handlers.getCurrentUser);
app.post('/auth/link-wallet', authenticateRequest, handlers.linkWallet);
app.post('/auth/verify-wallet', handlers.verifyWallet);
app.post('/auth/wallet-login', handlers.walletLogin);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================
app.get('/users', authenticateRequest, requireRole(['admin']), handlers.getAllUsers);
app.post('/users', authenticateRequest, requireRole(['admin']), handlers.createUser);

// ============================================================================
// SOLANA ROUTES
// ============================================================================
app.post('/mint-token', authenticateRequest, handlers.handleMintToken);
app.post('/create-wallet', authenticateRequest, handlers.handleCreateWallet);
app.get('/balance/:publicKey', authenticateRequest, handlers.handleGetBalance);

// ============================================================================
// CAP TABLE ROUTES
// ============================================================================
app.get('/cap-table/:mintAddress', authenticateRequest, handlers.getCapTable);
app.get('/cap-table/:mintAddress/:blockHeight', authenticateRequest, handlers.getHistoricalCapTable);
app.post('/cap-table/:mintAddress/export', authenticateRequest, handlers.exportCapTable);
app.get('/transfers/:mintAddress', authenticateRequest, handlers.getTransfers);
app.get('/cap-table/:mintAddress/history/holder-count', authenticateRequest, handlers.getHolderHistory);
app.get('/cap-table/:mintAddress/metrics/concentration', authenticateRequest, handlers.getConcentration);

// ============================================================================
// SECURITIES ROUTES
// ============================================================================
app.get('/securities', authenticateRequest, handlers.getAllSecurities);
app.get('/securities/:mintAddress', authenticateRequest, handlers.getSecurityByMint);
app.get('/allowlist/:mintAddress', authenticateRequest, requireRole(['admin', 'issuer']), handlers.getAllowlist);
app.get('/allowlist/:mintAddress/:walletAddress', authenticateRequest, handlers.checkAllowlistStatus);
app.get('/holdings/:walletAddress', authenticateRequest, handlers.getWalletHoldings);

// ============================================================================
// ADMIN ROUTES
// ============================================================================
app.post('/admin/token/initialize', authenticateRequest, requireRole(['admin']), handlers.initializeToken);
app.post('/admin/allowlist/approve', authenticateRequest, requireRole(['admin', 'issuer']), handlers.approveWallet);
app.post('/admin/allowlist/revoke', authenticateRequest, requireRole(['admin', 'issuer']), handlers.revokeWallet);
app.post('/admin/mint', authenticateRequest, requireRole(['admin', 'issuer']), handlers.mintTokens);
app.post('/admin/corporate-actions/split', authenticateRequest, requireRole(['admin']), handlers.stockSplit);
app.post('/admin/corporate-actions/change-symbol', authenticateRequest, requireRole(['admin']), handlers.changeSymbol);

// Initialize WebSocket server
initWebSocketServer(server);

// Start server
server.listen(PORT, () => {
    console.log(`HTTP server running on http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});
