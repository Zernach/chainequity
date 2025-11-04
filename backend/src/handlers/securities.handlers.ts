import { Response } from 'express';
import { supabase } from '../db';
import { AuthRequest } from '../types/auth.types';

/**
 * Get all securities (token mints)
 * GET /securities
 */
export async function getAllSecurities(_req: AuthRequest, res: Response) {
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
}

/**
 * Get security details by mint address
 * GET /securities/:mintAddress
 */
export async function getSecurityByMint(req: AuthRequest, res: Response) {
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
}

/**
 * Get allowlist entries for a security
 * GET /allowlist/:mintAddress
 */
export async function getAllowlist(req: AuthRequest, res: Response) {
    try {
        const { mintAddress } = req.params;

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
}

/**
 * Check if a wallet is on the allowlist
 * GET /allowlist/:mintAddress/:walletAddress
 */
export async function checkAllowlistStatus(req: AuthRequest, res: Response) {
    try {
        const { mintAddress, walletAddress } = req.params;

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

        const { data, error } = await supabase
            .from('allowlist')
            .select('*')
            .eq('security_id', security.id)
            .eq('wallet_address', walletAddress)
            .single();

        if (error && error.code !== 'PGRST116') {
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
}

