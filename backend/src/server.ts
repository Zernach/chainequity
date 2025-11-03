import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './db';
import { mintToken, createWallet, getBalance } from './solana';
import { initWebSocketServer, broadcastSolanaTransaction } from './websocket';
import {
    generateCapTable,
    exportCapTableCSV,
    exportCapTableJSON,
    getTransferHistory,
    getHolderCountHistory,
    getConcentrationMetrics,
} from './cap-table';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = parseInt(process.env.WS_PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        message: 'ChainEquity backend is running',
        timestamp: new Date().toISOString(),
    });
});

// Get all users
app.get('/users', async (_req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            users: data,
            count: data.length,
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

// Create new user
app.post('/users', async (req: Request, res: Response) => {
    try {
        const { name, wallet_address } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Name is required',
            });
        }

        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    name,
                    wallet_address: wallet_address || null,
                },
            ])
            .select();

        if (error) throw error;

        return res.json({
            success: true,
            user: data[0],
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

// Mint Solana token (devnet airdrop)
app.post('/mint-token', async (req: Request, res: Response) => {
    try {
        const { amount } = req.body;
        const tokenAmount = amount || 1;

        console.log(`Minting ${tokenAmount} SOL on devnet...`);
        const result = await mintToken(null, tokenAmount);

        // Broadcast to WebSocket clients
        if (result.success) {
            broadcastSolanaTransaction(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Error in mint-token endpoint:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

// Create new Solana wallet
app.post('/create-wallet', async (_req: Request, res: Response) => {
    try {
        const wallet = createWallet();
        res.json({
            success: true,
            wallet,
        });
    } catch (error) {
        console.error('Error creating wallet:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

// Get wallet balance
app.get('/balance/:publicKey', async (req: Request, res: Response) => {
    try {
        const { publicKey } = req.params;
        const balance = await getBalance(publicKey);

        if (balance === null) {
            return res.status(400).json({
                success: false,
                error: 'Invalid public key or unable to fetch balance',
            });
        }

        return res.json({
            success: true,
            publicKey,
            balance,
        });
    } catch (error) {
        console.error('Error getting balance:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

// ============================================================================
// CAP TABLE ENDPOINTS
// ============================================================================

/**
 * Get current cap table for a token
 * GET /cap-table/:mintAddress
 */
app.get('/cap-table/:mintAddress', async (req: Request, res: Response) => {
    try {
        const { mintAddress } = req.params;
        const capTable = await generateCapTable(mintAddress);

        res.json({
            success: true,
            data: capTable,
        });
    } catch (error) {
        console.error('Error generating cap table:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * Get historical cap table at a specific block height
 * GET /cap-table/:mintAddress/:blockHeight
 */
app.get('/cap-table/:mintAddress/:blockHeight', async (req: Request, res: Response) => {
    try {
        const { mintAddress, blockHeight } = req.params;
        const blockHeightNum = parseInt(blockHeight, 10);

        if (isNaN(blockHeightNum) || blockHeightNum < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid block height',
            });
        }

        const capTable = await generateCapTable(mintAddress, blockHeightNum);

        return res.json({
            success: true,
            data: capTable,
        });
    } catch (error) {
        console.error('Error generating historical cap table:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * Export cap table as CSV or JSON
 * POST /cap-table/:mintAddress/export
 * Body: { format: 'csv' | 'json', blockHeight?: number }
 */
app.post('/cap-table/:mintAddress/export', async (req: Request, res: Response) => {
    try {
        const { mintAddress } = req.params;
        const { format = 'json', blockHeight = null } = req.body;

        const capTable = await generateCapTable(mintAddress, blockHeight);

        if (format === 'csv') {
            const csv = exportCapTableCSV(capTable);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="cap-table-${mintAddress}-${Date.now()}.csv"`
            );
            return res.send(csv);
        } else if (format === 'json') {
            const json = exportCapTableJSON(capTable);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="cap-table-${mintAddress}-${Date.now()}.json"`
            );
            return res.send(json);
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid format. Use "csv" or "json"',
            });
        }
    } catch (error) {
        console.error('Error exporting cap table:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * Get transfer history for a token
 * GET /transfers/:mintAddress?limit=100&offset=0&from=...&to=...
 */
app.get('/transfers/:mintAddress', async (req: Request, res: Response) => {
    try {
        const { mintAddress } = req.params;
        const { limit, offset, from, to } = req.query;

        const options = {
            limit: limit ? parseInt(limit as string, 10) : 100,
            offset: offset ? parseInt(offset as string, 10) : 0,
            fromWallet: (from as string) || null,
            toWallet: (to as string) || null,
        };

        const result = await getTransferHistory(mintAddress, options);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Error fetching transfer history:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * Get holder count history over time
 * GET /cap-table/:mintAddress/history/holder-count
 */
app.get('/cap-table/:mintAddress/history/holder-count', async (req: Request, res: Response) => {
    try {
        const { mintAddress } = req.params;
        const history = await getHolderCountHistory(mintAddress);

        res.json({
            success: true,
            data: history,
        });
    } catch (error) {
        console.error('Error fetching holder count history:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * Get concentration metrics (top holders, Gini coefficient)
 * GET /cap-table/:mintAddress/metrics/concentration
 */
app.get('/cap-table/:mintAddress/metrics/concentration', async (req: Request, res: Response) => {
    try {
        const { mintAddress } = req.params;
        const metrics = await getConcentrationMetrics(mintAddress);

        res.json({
            success: true,
            data: metrics,
        });
    } catch (error) {
        console.error('Error calculating concentration metrics:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

// ============================================================================
// SECURITIES ENDPOINTS
// ============================================================================

/**
 * Get all securities (token mints)
 * GET /securities
 */
app.get('/securities', async (_req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('securities')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            securities: data,
            count: data.length,
        });
    } catch (error) {
        console.error('Error fetching securities:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * Get security details by mint address
 * GET /securities/:mintAddress
 */
app.get('/securities/:mintAddress', async (req: Request, res: Response) => {
    try {
        const { mintAddress } = req.params;

        const { data, error } = await supabase
            .from('securities')
            .select('*')
            .eq('mint_address', mintAddress)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Security not found',
            });
        }

        return res.json({
            success: true,
            security: data,
        });
    } catch (error) {
        console.error('Error fetching security:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * Get allowlist entries for a security
 * GET /allowlist/:mintAddress
 */
app.get('/allowlist/:mintAddress', async (req: Request, res: Response) => {
    try {
        const { mintAddress } = req.params;

        // Get security ID
        const { data: security } = await supabase
            .from('securities')
            .select('id')
            .eq('mint_address', mintAddress)
            .single();

        if (!security) {
            return res.status(404).json({
                success: false,
                error: 'Security not found',
            });
        }

        // Get allowlist entries
        const { data, error } = await supabase
            .from('allowlist')
            .select('*')
            .eq('security_id', security.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return res.json({
            success: true,
            allowlist: data,
            count: data.length,
        });
    } catch (error) {
        console.error('Error fetching allowlist:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * Check if a wallet is on the allowlist
 * GET /allowlist/:mintAddress/:walletAddress
 */
app.get('/allowlist/:mintAddress/:walletAddress', async (req: Request, res: Response) => {
    try {
        const { mintAddress, walletAddress } = req.params;

        // Get security ID
        const { data: security } = await supabase
            .from('securities')
            .select('id')
            .eq('mint_address', mintAddress)
            .single();

        if (!security) {
            return res.status(404).json({
                success: false,
                error: 'Security not found',
            });
        }

        // Check allowlist status
        const { data, error } = await supabase
            .from('allowlist')
            .select('*')
            .eq('security_id', security.id)
            .eq('wallet_address', walletAddress)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned
            throw error;
        }

        const isApproved = data && data.status === 'approved';

        return res.json({
            success: true,
            wallet_address: walletAddress,
            is_approved: isApproved,
            status: data?.status || 'not_found',
            details: data || null,
        });
    } catch (error) {
        console.error('Error checking allowlist:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

// Start servers
app.listen(PORT, () => {
    console.log(`Express server running on http://localhost:${PORT}`);
});

// Initialize WebSocket server
initWebSocketServer(WS_PORT);

