import { Request, Response } from 'express';
import {
    AuthRequest,
    SignupRequest,
    LoginRequest,
    LinkWalletRequest,
    VerifyWalletRequest,
    WalletLoginRequest,
} from '../types/auth.types';
import {
    supabaseClient,
    supabaseAdmin,
    createUserWithEmail,
    createOrLoginWithWallet,
    linkWalletToUser,
    verifyWalletSignature,
    getUserByAuthId,
} from '../auth';

/**
 * Sign up with email/password
 * POST /auth/signup
 */
export async function signup(req: Request, res: Response) {
    try {
        const signupData: SignupRequest = req.body;

        if (!signupData.email || !signupData.password || !signupData.name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required',
            });
        }

        const result = await createUserWithEmail(signupData);

        if (!result.success || !result.user) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Failed to create account',
            });
        }

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
}

/**
 * Login with email/password
 * POST /auth/login
 */
export async function login(req: Request, res: Response) {
    try {
        const { email, password }: LoginRequest = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
        }

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
}

/**
 * Logout
 * POST /auth/logout
 */
export async function logout(_req: AuthRequest, res: Response) {
    try {
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
}

/**
 * Request a nonce for wallet signature
 * POST /auth/request-nonce
 */
export async function requestNonce(req: Request, res: Response) {
    try {
        const { wallet_address } = req.body;
        const { nonceManager } = require('../nonce');

        const storedNonce = nonceManager.createNonce(wallet_address);

        return res.json({
            success: true,
            nonce: storedNonce.nonce,
            expiresAt: storedNonce.expiresAt,
            expiresIn: Math.floor((storedNonce.expiresAt - Date.now()) / 1000),
        });
    } catch (error) {
        console.error('Request nonce error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate nonce',
        });
    }
}

/**
 * Get formatted wallet signature message with nonce
 * GET /auth/wallet-message/:nonce
 */
export async function getWalletMessage(req: Request, res: Response) {
    try {
        const { nonce } = req.params;
        const { nonceManager } = require('../nonce');

        if (!nonceManager.isValid(nonce)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired nonce',
            });
        }

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
}

/**
 * Get current user profile
 * GET /auth/me
 */
export async function getCurrentUser(req: AuthRequest, res: Response) {
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
}

/**
 * Link wallet to existing authenticated user
 * POST /auth/link-wallet
 */
export async function linkWallet(req: AuthRequest, res: Response) {
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

        const result = await linkWalletToUser(req.user.id, wallet_address, signature, message);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Failed to link wallet',
            });
        }

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
}

/**
 * Verify wallet signature (without linking)
 * POST /auth/verify-wallet
 */
export async function verifyWallet(req: Request, res: Response) {
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
}

/**
 * Login or create account with wallet
 * POST /auth/wallet-login
 */
export async function walletLogin(req: Request, res: Response) {
    try {
        const walletData: WalletLoginRequest = req.body;

        if (!walletData.wallet_address || !walletData.signature || !walletData.message) {
            return res.status(400).json({
                success: false,
                error: 'wallet_address, signature, and message are required',
            });
        }

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
}

