/**
 * Authentication and Authorization Middleware
 * Handles Supabase Auth integration and role-based access control
 */

import { Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import {
    AuthRequest,
    AuthUser,
    UserRole,
    WalletVerification,
    SignupRequest,
    WalletLoginRequest,
} from './types/auth.types';

dotenv.config();

// Create Supabase clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Client for user operations (uses anon key)
export const supabaseClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend operations (uses service role key)
export const supabaseAdmin: SupabaseClient = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : supabaseClient;

/**
 * Middleware to authenticate requests using Supabase JWT
 * Extracts user from JWT and attaches to request
 */
export async function authenticateRequest(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Missing or invalid authorization header',
            });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify JWT with Supabase
        const {
            data: { user: authUser },
            error,
        } = await supabaseAdmin.auth.getUser(token);

        if (error || !authUser) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
            });
            return;
        }

        // Fetch user profile from database
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('auth_user_id', authUser.id)
            .single();

        if (profileError || !userProfile) {
            res.status(401).json({
                success: false,
                error: 'User profile not found',
            });
            return;
        }

        // Attach user to request
        req.user = userProfile as AuthUser;
        req.authUserId = authUser.id;

        next();
    } catch (error) {
        console.error('[Auth] Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}

/**
 * Middleware factory to require specific roles
 * Usage: app.get('/admin', authenticateRequest, requireRole(['admin']), handler)
 */
export function requireRole(roles: UserRole[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
            });
            return;
        }

        const userRole = req.user.role;
        if (!roles.includes(userRole)) {
            res.status(403).json({
                success: false,
                error: `Access denied. Required roles: ${roles.join(', ')}`,
                userRole,
                requiredRoles: roles,
            });
            return;
        }

        next();
    };
}

/**
 * Optional authentication - attaches user if token is valid but doesn't reject if missing
 */
export async function optionalAuth(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }

        const token = authHeader.substring(7);
        const {
            data: { user: authUser },
        } = await supabaseAdmin.auth.getUser(token);

        if (authUser) {
            const { data: userProfile } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('auth_user_id', authUser.id)
                .single();

            if (userProfile) {
                req.user = userProfile as AuthUser;
                req.authUserId = authUser.id;
            }
        }

        next();
    } catch (error) {
        console.error('[Auth] Optional auth error:', error);
        next();
    }
}

/**
 * Link a wallet address to an existing user
 * Verifies wallet ownership via signature before linking
 */
export async function linkWalletToUser(
    userId: string,
    walletAddress: string,
    signature: string,
    message: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
        // Verify wallet signature
        const verification = verifyWalletSignature(walletAddress, signature, message);
        if (!verification.valid) {
            return {
                success: false,
                error: verification.error || 'Invalid wallet signature',
            };
        }

        // Check if wallet is already linked to another user
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id, name')
            .eq('wallet_address', walletAddress)
            .neq('id', userId)
            .single();

        if (existingUser) {
            return {
                success: false,
                error: 'Wallet address is already linked to another account',
            };
        }

        // Update user with wallet address
        const { data: updatedUser, error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                wallet_address: walletAddress,
                wallet_verified: true,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        return {
            success: true,
            user: updatedUser as AuthUser,
        };
    } catch (error) {
        console.error('[Auth] Link wallet error:', error);
        return {
            success: false,
            error: 'Failed to link wallet',
        };
    }
}

/**
 * Verify Solana wallet signature with nonce and timestamp validation
 * Message format: "Sign this message to verify wallet ownership.\n\nNonce: <nonce>\nTimestamp: <timestamp>"
 */
export function verifyWalletSignature(
    walletAddress: string,
    signature: string,
    message: string,
    requireNonce: boolean = true
): WalletVerification {
    try {
        // Import nonce utilities
        const {
            nonceManager,
            extractNonceFromMessage,
            extractTimestampFromMessage,
            validateTimestamp,
        } = require('./nonce');

        // Validate public key
        let publicKey: PublicKey;
        try {
            publicKey = new PublicKey(walletAddress);
        } catch {
            return {
                valid: false,
                wallet_address: walletAddress,
                error: 'Invalid wallet address format',
            };
        }

        // Extract and validate nonce (if required)
        if (requireNonce) {
            const nonce = extractNonceFromMessage(message);
            if (!nonce) {
                return {
                    valid: false,
                    wallet_address: walletAddress,
                    error: 'Message missing nonce',
                };
            }

            const nonceValidation = nonceManager.validateAndConsume(nonce, walletAddress);
            if (!nonceValidation.valid) {
                return {
                    valid: false,
                    wallet_address: walletAddress,
                    error: nonceValidation.error || 'Invalid nonce',
                };
            }
        }

        // Extract and validate timestamp
        const timestamp = extractTimestampFromMessage(message);
        if (!timestamp) {
            return {
                valid: false,
                wallet_address: walletAddress,
                error: 'Message missing timestamp',
            };
        }

        if (!validateTimestamp(timestamp)) {
            return {
                valid: false,
                wallet_address: walletAddress,
                error: 'Timestamp outside acceptable window',
            };
        }

        // Decode signature from base58
        let signatureBytes: Uint8Array;
        try {
            signatureBytes = bs58.decode(signature);
        } catch {
            return {
                valid: false,
                wallet_address: walletAddress,
                error: 'Invalid signature format',
            };
        }

        // Encode message to bytes
        const messageBytes = new TextEncoder().encode(message);

        // Verify signature using nacl
        const valid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKey.toBytes()
        );

        if (!valid) {
            return {
                valid: false,
                wallet_address: walletAddress,
                error: 'Signature verification failed',
            };
        }

        return {
            valid: true,
            wallet_address: walletAddress,
        };
    } catch (error) {
        console.error('[Auth] Signature verification error:', error);
        return {
            valid: false,
            wallet_address: walletAddress,
            error: 'Signature verification failed',
        };
    }
}

/**
 * Create a new user account with email/password
 */
export async function createUserWithEmail(
    signupData: SignupRequest
): Promise<{ success: boolean; user?: AuthUser; session?: any; error?: string }> {
    try {
        const { email, password, name, role = 'investor' } = signupData;

        // Create auth user in Supabase
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm in development
        });

        if (authError || !authData.user) {
            return {
                success: false,
                error: authError?.message || 'Failed to create auth user',
            };
        }

        // Create user profile
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .insert([
                {
                    auth_user_id: authData.user.id,
                    email,
                    name,
                    role,
                    email_verified: true,
                    wallet_verified: false,
                },
            ])
            .select()
            .single();

        if (profileError || !userProfile) {
            // Rollback: delete auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return {
                success: false,
                error: profileError?.message || 'Failed to create user profile',
            };
        }

        return {
            success: true,
            user: userProfile as AuthUser,
        };
    } catch (error) {
        console.error('[Auth] Create user error:', error);
        return {
            success: false,
            error: 'Failed to create user account',
        };
    }
}

/**
 * Store wallet passwords temporarily for session generation
 * In production, use a more secure method like Redis with TTL
 */
const walletPasswordStore = new Map<string, string>();

/**
 * Create or login user with wallet
 */
export async function createOrLoginWithWallet(
    walletData: WalletLoginRequest
): Promise<{ success: boolean; user?: AuthUser; session?: any; error?: string; isNewUser?: boolean }> {
    try {
        const { wallet_address, signature, message, email, name } = walletData;

        // Verify wallet signature
        const verification = verifyWalletSignature(wallet_address, signature, message);
        if (!verification.valid) {
            return {
                success: false,
                error: verification.error || 'Invalid wallet signature',
            };
        }

        // Check if wallet already exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('wallet_address', wallet_address)
            .single();

        if (existingUser) {
            // User exists - login
            if (!existingUser.auth_user_id) {
                return {
                    success: false,
                    error: 'User account is not properly configured',
                };
            }

            // Try to retrieve stored password or generate a new one
            let password = walletPasswordStore.get(wallet_address);
            if (!password) {
                // Generate new password and update user
                password = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

                // Update password in Supabase
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    existingUser.auth_user_id,
                    { password }
                );

                if (updateError) {
                    console.error('[Auth] Password update error:', updateError);
                    return {
                        success: false,
                        error: 'Failed to update credentials',
                    };
                }

                walletPasswordStore.set(wallet_address, password);
            }

            // Sign in with the password to get session
            const userEmail = existingUser.email || `${wallet_address}@wallet.local`;
            const { data: authData, error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: userEmail,
                password,
            });

            if (signInError || !authData.session) {
                console.error('[Auth] Sign in error:', signInError);
                // Clear stored password and try again next time
                walletPasswordStore.delete(wallet_address);
                return {
                    success: false,
                    error: 'Failed to generate session',
                };
            }

            return {
                success: true,
                user: existingUser as AuthUser,
                session: {
                    access_token: authData.session.access_token,
                    refresh_token: authData.session.refresh_token,
                    expires_in: authData.session.expires_in,
                    expires_at: authData.session.expires_at,
                },
                isNewUser: false,
            };
        }

        // New user - create account
        const userName = name || `User_${wallet_address.substring(0, 8)}`;
        const userEmail = email || `${wallet_address}@wallet.local`;

        // Generate password and store it
        const password = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        walletPasswordStore.set(wallet_address, password);

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: userEmail,
            password,
            email_confirm: !email, // Auto-confirm wallet-only accounts
        });

        if (authError || !authData.user) {
            walletPasswordStore.delete(wallet_address);
            return {
                success: false,
                error: authError?.message || 'Failed to create auth user',
            };
        }

        const authUserId = authData.user.id;

        // Create user profile
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .insert([
                {
                    auth_user_id: authUserId,
                    email: email || null, // Only set real email if provided
                    name: userName,
                    wallet_address,
                    role: 'investor',
                    email_verified: false,
                    wallet_verified: true,
                },
            ])
            .select()
            .single();

        if (profileError || !userProfile) {
            // Rollback: delete auth user and clear password
            await supabaseAdmin.auth.admin.deleteUser(authUserId);
            walletPasswordStore.delete(wallet_address);
            return {
                success: false,
                error: profileError?.message || 'Failed to create user profile',
            };
        }

        // Sign in with the password to get session
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: userEmail,
            password,
        });

        if (signInError || !signInData.session) {
            console.error('[Auth] Sign in error for new user:', signInError);
            // Don't fail registration, but user will need to login again
            return {
                success: true,
                user: userProfile as AuthUser,
                session: undefined,
                isNewUser: true,
            };
        }

        return {
            success: true,
            user: userProfile as AuthUser,
            session: {
                access_token: signInData.session.access_token,
                refresh_token: signInData.session.refresh_token,
                expires_in: signInData.session.expires_in,
                expires_at: signInData.session.expires_at,
            },
            isNewUser: true,
        };
    } catch (error) {
        console.error('[Auth] Wallet login error:', error);
        return {
            success: false,
            error: 'Failed to process wallet login',
        };
    }
}

/**
 * Get user by auth_user_id
 */
export async function getUserByAuthId(
    authUserId: string
): Promise<AuthUser | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('auth_user_id', authUserId)
            .single();

        if (error || !data) {
            return null;
        }

        return data as AuthUser;
    } catch (error) {
        console.error('[Auth] Get user error:', error);
        return null;
    }
}

