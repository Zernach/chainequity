import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateRequest, requireRole } from './auth';
import { initWebSocketServer } from './websocket';
import { createIndexer } from './indexer';
import { connection } from './solana';
import { logger } from './utils/logger';
import * as handlers from './handlers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const server = createServer(app);

// Global indexer instance
let indexerInstance: any = null;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
    const indexerStatus = indexerInstance ? indexerInstance.getStatus() : null;

    res.json({
        status: 'ok',
        message: 'ChainEquity backend is running',
        timestamp: new Date().toISOString(),
        indexer: indexerStatus ? {
            enabled: true,
            running: indexerStatus.isRunning,
            lastProcessedSlot: indexerStatus.lastProcessedSlot,
            subscriptionActive: indexerStatus.subscriptionActive,
            reconnectAttempts: indexerStatus.reconnectAttempts,
        } : {
            enabled: false,
        },
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
app.get('/cap-table/:mintAddress/history/holder-count', authenticateRequest, handlers.getHolderHistory);
app.get('/cap-table/:mintAddress/metrics/concentration', authenticateRequest, handlers.getConcentration);
app.post('/cap-table/:mintAddress/export', authenticateRequest, handlers.exportCapTable);
app.post('/cap-table/:mintAddress/snapshots', authenticateRequest, handlers.createSnapshot);
app.get('/cap-table/:mintAddress/snapshots', authenticateRequest, handlers.listSnapshots);
app.get('/cap-table/:mintAddress/snapshots/:blockHeight', authenticateRequest, handlers.getSnapshot);
app.get('/cap-table/:mintAddress/:blockHeight', authenticateRequest, handlers.getHistoricalCapTable);
app.get('/transfers/:mintAddress', authenticateRequest, handlers.getTransfers);

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
app.get('/admin/holdings/all', authenticateRequest, requireRole(['admin']), handlers.getAllTokenHoldings);

// Indexer status endpoint
app.get('/admin/indexer/status', authenticateRequest, requireRole(['admin']), (_req: Request, res: Response) => {
    if (!indexerInstance) {
        res.json({
            enabled: false,
            message: 'Indexer is not enabled',
        });
        return;
    }

    const status = indexerInstance.getStatus();
    res.json({
        enabled: true,
        ...status,
        network: process.env.SOLANA_NETWORK || 'devnet',
        programId: process.env.GATED_TOKEN_PROGRAM_ID,
    });
});

// Initialize WebSocket server
initWebSocketServer(server);

// Initialize and start Solana event indexer
async function startIndexer() {
    const enableIndexer = process.env.ENABLE_INDEXER !== 'false';

    if (!enableIndexer) {
        logger.info('Indexer is disabled via ENABLE_INDEXER environment variable');
        return;
    }

    const programId = process.env.GATED_TOKEN_PROGRAM_ID;

    if (!programId) {
        logger.warn('GATED_TOKEN_PROGRAM_ID not set, skipping indexer initialization');
        return;
    }

    try {
        logger.info('Initializing Solana event indexer...', {
            programId,
            network: process.env.SOLANA_NETWORK || 'devnet'
        });

        const indexer = await createIndexer(connection, programId);
        indexerInstance = indexer;

        // Set up event listeners for monitoring
        indexer.on('started', () => {
            logger.info('🚀 Event indexer started and listening for on-chain events');
        });

        indexer.on('error', (error: Error) => {
            logger.error('Event indexer error', error);
        });

        indexer.on('stopped', () => {
            logger.info('Event indexer stopped');
        });

        indexer.on('reconnected', () => {
            logger.info('✅ Event indexer reconnected successfully');
        });

        indexer.on('max_reconnects_reached', () => {
            logger.error('❌ Event indexer failed: maximum reconnection attempts reached');
        });

        indexer.on('token_initialized', (data: any) => {
            logger.info('📝 Token initialized event processed', data);
        });

        indexer.on('wallet_approved', (data: any) => {
            logger.info('✅ Wallet approved event processed', data);
        });

        indexer.on('wallet_revoked', (data: any) => {
            logger.info('❌ Wallet revoked event processed', data);
        });

        indexer.on('tokens_minted', (data: any) => {
            logger.info('🪙 Tokens minted event processed', data);
        });

        indexer.on('tokens_transferred', (data: any) => {
            logger.info('💸 Tokens transferred event processed', data);
        });

        // Start the indexer
        await indexer.start();

        // Handle graceful shutdown
        const shutdown = async () => {
            logger.info('Shutting down indexer...');
            await indexer.stop();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        logger.error('Failed to start indexer', error as Error);
    }
}

// Start server
server.listen(PORT, async () => {
    console.log(`HTTP server running on http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);

    // Start the Solana event indexer
    await startIndexer();
});
