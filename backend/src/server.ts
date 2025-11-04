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
import {
    authenticateRequest,
    requireRole,
    supabaseClient,
    supabaseAdmin,
    createUserWithEmail,
    createOrLoginWithWallet,
    linkWalletToUser,
    verifyWalletSignature,
    getUserByAuthId,
} from './auth';
import {
    AuthRequest,
    SignupRequest,
    LoginRequest,
    LinkWalletRequest,
    VerifyWalletRequest,
    WalletLoginRequest,
} from './types/auth.types';

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

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

/**
 * Sign up with email/password
 * POST /auth/signup
 * Body: { email, password, name, role? }
 */
app.post('/auth/signup', async (req: Request, res: Response) => {
    try {
        const signupData: SignupRequest = req.body;

        // Validate required fields
        if (!signupData.email || !signupData.password || !signupData.name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required',
            });
        }

        // Create user
        const result = await createUserWithEmail(signupData);

        if (!result.success || !result.user) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Failed to create account',
            });
        }

        // Session token generation is handled by Supabase automatically

        return res.json({
            success: true,
            user: result.user,
            message: 'Account created successfully',
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create account',
        });
    }
});

/**
 * Login with email/password
 * POST /auth/login
 * Body: { email, password }
 */
app.post('/auth/login', async (req: Request, res: Response) => {
    try {
        const { email, password }: LoginRequest = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
        }

        // Authenticate with Supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            });
        }

        // Fetch user profile
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('auth_user_id', data.user.id)
            .single();

        if (profileError || !userProfile) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch user profile',
            });
        }

        return res.json({
            success: true,
            user: userProfile,
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in,
                expires_at: data.session.expires_at,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to login',
        });
    }
});

/**
 * Logout
 * POST /auth/logout
 * Headers: Authorization: Bearer <token>
 */
app.post('/auth/logout', authenticateRequest, async (_req: AuthRequest, res: Response) => {
    try {
        // Supabase handles JWT invalidation automatically
        // This endpoint is mainly for consistency and logging
        return res.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to logout',
        });
    }
});

/**
 * Request a nonce for wallet signature
 * POST /auth/request-nonce
 * Body: { wallet_address? } (optional: associate nonce with wallet)
 */
app.post('/auth/request-nonce', async (req: Request, res: Response) => {
    try {
        const { wallet_address } = req.body;
        const { nonceManager } = require('./nonce');

        // Create nonce
        const storedNonce = nonceManager.createNonce(wallet_address);

        return res.json({
            success: true,
            nonce: storedNonce.nonce,
            expiresAt: storedNonce.expiresAt,
            expiresIn: Math.floor((storedNonce.expiresAt - Date.now()) / 1000), // seconds
        });
    } catch (error) {
        console.error('Request nonce error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate nonce',
        });
    }
});

/**
 * Get formatted wallet signature message with nonce
 * GET /auth/wallet-message/:nonce
 */
app.get('/auth/wallet-message/:nonce', async (req: Request, res: Response) => {
    try {
        const { nonce } = req.params;
        const { nonceManager } = require('./nonce');

        // Verify nonce exists and is valid
        if (!nonceManager.isValid(nonce)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired nonce',
            });
        }

        // Generate message
        const timestamp = Date.now();
        const message = `Sign this message to verify wallet ownership.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

        return res.json({
            success: true,
            message,
            nonce,
            timestamp,
        });
    } catch (error) {
        console.error('Get wallet message error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate message',
        });
    }
});

/**
 * Get current user profile
 * GET /auth/me
 * Headers: Authorization: Bearer <token>
 */
app.get('/auth/me', authenticateRequest, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
        }

        return res.json({
            success: true,
            user: req.user,
        });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
        });
    }
});

/**
 * Link wallet to existing authenticated user
 * POST /auth/link-wallet
 * Headers: Authorization: Bearer <token>
 * Body: { wallet_address, signature, message }
 */
app.post('/auth/link-wallet', authenticateRequest, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
        }

        const { wallet_address, signature, message }: LinkWalletRequest = req.body;

        if (!wallet_address || !signature || !message) {
            return res.status(400).json({
                success: false,
                error: 'wallet_address, signature, and message are required',
            });
        }

        // Link wallet to user
        const result = await linkWalletToUser(req.user.id, wallet_address, signature, message);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Failed to link wallet',
            });
        }

        // Fetch updated user profile
        const updatedUser = await getUserByAuthId(req.user.auth_user_id);

        return res.json({
            success: true,
            user: updatedUser,
            message: 'Wallet linked successfully',
        });
    } catch (error) {
        console.error('Link wallet error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to link wallet',
        });
    }
});

/**
 * Verify wallet signature (without linking)
 * POST /auth/verify-wallet
 * Body: { wallet_address, signature, message }
 */
app.post('/auth/verify-wallet', async (req: Request, res: Response) => {
    try {
        const { wallet_address, signature, message }: VerifyWalletRequest = req.body;

        if (!wallet_address || !signature || !message) {
            return res.status(400).json({
                success: false,
                error: 'wallet_address, signature, and message are required',
            });
        }

        const verification = verifyWalletSignature(wallet_address, signature, message);

        if (!verification.valid) {
            return res.status(400).json({
                success: false,
                error: verification.error || 'Invalid signature',
                verification,
            });
        }

        return res.json({
            success: true,
            verification,
            message: 'Signature verified successfully',
        });
    } catch (error) {
        console.error('Verify wallet error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify signature',
        });
    }
});

/**
 * Login or create account with wallet
 * POST /auth/wallet-login
 * Body: { wallet_address, signature, message, email?, name? }
 */
app.post('/auth/wallet-login', async (req: Request, res: Response) => {
    try {
        const walletData: WalletLoginRequest = req.body;

        if (!walletData.wallet_address || !walletData.signature || !walletData.message) {
            return res.status(400).json({
                success: false,
                error: 'wallet_address, signature, and message are required',
            });
        }

        // Create or login user
        const result = await createOrLoginWithWallet(walletData);

        if (!result.success || !result.user) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Failed to process wallet login',
            });
        }

        return res.json({
            success: true,
            user: result.user,
            session: result.session,
            isNewUser: result.isNewUser,
            message: result.isNewUser
                ? 'Account created successfully'
                : 'Logged in successfully',
        });
    } catch (error) {
        console.error('Wallet login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to process wallet login',
        });
    }
});

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

// Get all users (admin only)
app.get('/users', authenticateRequest, requireRole(['admin']), async (_req: AuthRequest, res: Response) => {
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

// Create new user (admin only - for manual user creation)
app.post('/users', authenticateRequest, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
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

// ============================================================================
// SOLANA ENDPOINTS
// ============================================================================

// Mint Solana token (devnet airdrop) - authenticated users only
app.post('/mint-token', authenticateRequest, async (req: AuthRequest, res: Response) => {
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

// Create new Solana wallet - authenticated users only
app.post('/create-wallet', authenticateRequest, async (_req: AuthRequest, res: Response) => {
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

// Get wallet balance - authenticated users only
app.get('/balance/:publicKey', authenticateRequest, async (req: AuthRequest, res: Response) => {
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
 * Get current cap table for a token - authenticated users
 * GET /cap-table/:mintAddress
 */
app.get('/cap-table/:mintAddress', authenticateRequest, async (req: AuthRequest, res: Response) => {
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
 * Get historical cap table at a specific block height - authenticated users
 * GET /cap-table/:mintAddress/:blockHeight
 */
app.get('/cap-table/:mintAddress/:blockHeight', authenticateRequest, async (req: AuthRequest, res: Response) => {
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
 * Export cap table as CSV or JSON - authenticated users
 * POST /cap-table/:mintAddress/export
 * Body: { format: 'csv' | 'json', blockHeight?: number }
 */
app.post('/cap-table/:mintAddress/export', authenticateRequest, async (req: AuthRequest, res: Response) => {
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
 * Get transfer history for a token - authenticated users
 * GET /transfers/:mintAddress?limit=100&offset=0&from=...&to=...
 */
app.get('/transfers/:mintAddress', authenticateRequest, async (req: AuthRequest, res: Response) => {
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
 * Get holder count history over time - authenticated users
 * GET /cap-table/:mintAddress/history/holder-count
 */
app.get('/cap-table/:mintAddress/history/holder-count', authenticateRequest, async (req: AuthRequest, res: Response) => {
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
 * Get concentration metrics (top holders, Gini coefficient) - authenticated users
 * GET /cap-table/:mintAddress/metrics/concentration
 */
app.get('/cap-table/:mintAddress/metrics/concentration', authenticateRequest, async (req: AuthRequest, res: Response) => {
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
 * Get all securities (token mints) - authenticated users
 * GET /securities
 */
app.get('/securities', authenticateRequest, async (_req: AuthRequest, res: Response) => {
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
 * Get security details by mint address - authenticated users
 * GET /securities/:mintAddress
 */
app.get('/securities/:mintAddress', authenticateRequest, async (req: AuthRequest, res: Response) => {
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
 * Get allowlist entries for a security - admins and issuers only
 * GET /allowlist/:mintAddress
 */
app.get('/allowlist/:mintAddress', authenticateRequest, requireRole(['admin', 'issuer']), async (req: AuthRequest, res: Response) => {
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
 * Check if a wallet is on the allowlist - authenticated users
 * GET /allowlist/:mintAddress/:walletAddress
 */
app.get('/allowlist/:mintAddress/:walletAddress', authenticateRequest, async (req: AuthRequest, res: Response) => {
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

