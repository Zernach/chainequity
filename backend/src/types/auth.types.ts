/**
 * Authentication and Authorization Types
 */

import { Request } from 'express';

/**
 * User roles with different permission levels
 */
export type UserRole = 'admin' | 'issuer' | 'investor' | 'viewer';

/**
 * Authenticated user information
 */
export interface AuthUser {
    id: string; // users.id (UUID)
    auth_user_id: string; // auth.users.id (UUID from Supabase Auth)
    email: string | null;
    name: string;
    role: UserRole;
    wallet_address: string | null;
    email_verified: boolean;
    wallet_verified: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Minimal auth user for session verification
 */
export interface SessionUser {
    auth_user_id: string;
    email: string | null;
    role: UserRole;
}

/**
 * Express Request with authenticated user
 */
export interface AuthRequest extends Request {
    user?: AuthUser;
    authUserId?: string; // Supabase auth.users.id
}

/**
 * Signup request body (DEPRECATED - use WalletLoginRequest instead)
 */
export interface SignupRequest {
    email?: string;
    password?: string;
    name: string;
    role?: UserRole; // Optional, defaults to 'investor'
}

/**
 * Login request body (DEPRECATED - use WalletLoginRequest instead)
 */
export interface LoginRequest {
    email?: string;
    password?: string;
}

/**
 * Wallet login request body
 */
export interface WalletLoginRequest {
    wallet_address: string;
    signature: string;
    message: string;
    email?: string; // Optional for new users
    name?: string; // Optional for new users
}

/**
 * Link wallet request body
 */
export interface LinkWalletRequest {
    wallet_address: string;
    signature: string;
    message: string;
}

/**
 * Verify wallet signature request body
 */
export interface VerifyWalletRequest {
    wallet_address: string;
    signature: string;
    message: string;
}

/**
 * Auth response
 */
export interface AuthResponse {
    success: boolean;
    user?: AuthUser;
    session?: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        expires_at: number;
    };
    error?: string;
}

/**
 * Wallet verification result
 */
export interface WalletVerification {
    valid: boolean;
    wallet_address: string;
    error?: string;
}

/**
 * Role permission check result
 */
export interface RoleCheck {
    hasPermission: boolean;
    userRole?: UserRole;
    requiredRoles: UserRole[];
}

