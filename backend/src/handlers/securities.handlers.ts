import { Response } from 'express';
import { supabaseAdmin } from '../db';
import { AuthRequest } from '../types/auth.types';

/**
 * Get all securities (token mints)
 * GET /securities
 */
export async function getAllSecurities(_req: AuthRequest, res: Response) {
    try {
        // Use supabaseAdmin to bypass RLS and see all securities
        const { data, error } = await supabaseAdmin
            .from('securities')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('[Securities] Found securities:', data);

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

        // Use supabaseAdmin to bypass RLS
        const { data, error } = await supabaseAdmin
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

        // Use supabaseAdmin to bypass RLS
        const { data: security } = await supabaseAdmin
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

        const { data, error } = await supabaseAdmin
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

        // Use supabaseAdmin to bypass RLS
        const { data: security } = await supabaseAdmin
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

        const { data, error } = await supabaseAdmin
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

/**
 * Get token balance for a specific mint and wallet
 * GET /token/:mintAddress/balance/:walletAddress
 */
export async function getTokenBalance(req: AuthRequest, res: Response) {
    try {
        const { mintAddress, walletAddress } = req.params;

        console.log('[Balance] Fetching balance for:', { mintAddress, walletAddress });

        // First get the security
        const { data: security, error: securityError } = await supabaseAdmin
            .from('securities')
            .select('id, symbol, name, decimals')
            .eq('mint_address', mintAddress)
            .single();

        if (securityError || !security) {
            console.error('[Balance] Security not found:', securityError);
            return res.status(404).json({
                success: false,
                error: 'Token not found',
            });
        }

        // Query token balance
        const { data, error } = await supabaseAdmin
            .from('token_balances')
            .select('balance')
            .eq('security_id', security.id)
            .eq('wallet_address', walletAddress)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Balance] Database error:', error);
            throw error;
        }

        // If no balance found, return 0
        const balance = data?.balance || 0;

        console.log('[Balance] Found balance:', balance);

        return res.json({
            success: true,
            balance: {
                mint: mintAddress,
                wallet: walletAddress,
                amount: balance.toString(),
                decimals: security.decimals,
                symbol: security.symbol,
                name: security.name,
            },
        });
    } catch (error) {
        console.error('[Balance] Error fetching token balance:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Get token holdings for a wallet
 * GET /holdings/:walletAddress
 */
export async function getWalletHoldings(req: AuthRequest, res: Response) {
    try {
        const { walletAddress } = req.params;

        console.log('[Holdings] Fetching holdings for wallet:', walletAddress);

        // Query token_balances joined with securities (use supabaseAdmin to bypass RLS)
        const { data, error } = await supabaseAdmin
            .from('token_balances')
            .select(`
                balance,
                securities (
                    mint_address,
                    symbol,
                    name,
                    decimals,
                    current_supply
                )
            `)
            .eq('wallet_address', walletAddress)
            .gt('balance', 0);

        if (error) {
            console.error('[Holdings] Database error:', error);
            throw error;
        }

        console.log('[Holdings] Raw data from database:', data);

        // Transform the data into the format expected by the frontend
        const holdings = (data || []).map((item: any) => {
            const security = item.securities;
            const balance = item.balance;

            // Calculate percentage if we have supply data
            const percentage = security?.current_supply && security.current_supply > 0
                ? (balance / security.current_supply) * 100
                : undefined;

            return {
                mint: security?.mint_address || '',
                symbol: security?.symbol || 'UNKNOWN',
                name: security?.name || 'Unknown Token',
                balance: balance.toString(),
                decimals: security?.decimals || 9,
                percentage,
            };
        });

        console.log('[Holdings] Transformed holdings:', holdings);

        return res.json({
            success: true,
            holdings,
            count: holdings.length,
        });
    } catch (error) {
        console.error('[Holdings] Error fetching wallet holdings:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Get all token holdings across all wallets (admin only)
 * GET /admin/holdings/all
 */
export async function getAllTokenHoldings(_req: AuthRequest, res: Response) {
    try {
        console.log('[Holdings] Fetching all token holdings');

        // Query all token_balances joined with securities and users
        const { data, error } = await supabaseAdmin
            .from('token_balances')
            .select(`
                wallet_address,
                balance,
                securities (
                    mint_address,
                    symbol,
                    name,
                    decimals,
                    current_supply
                )
            `)
            .gt('balance', 0)
            .order('balance', { ascending: false });

        if (error) {
            console.error('[Holdings] Database error:', error);
            throw error;
        }

        console.log('[Holdings] Raw data from database:', data);

        // Group holdings by token mint
        const holdingsByToken: Record<string, any> = {};

        (data || []).forEach((item: any) => {
            const security = item.securities;
            if (!security) return;

            const mintAddress = security.mint_address;

            if (!holdingsByToken[mintAddress]) {
                holdingsByToken[mintAddress] = {
                    mint: mintAddress,
                    symbol: security.symbol || 'UNKNOWN',
                    name: security.name || 'Unknown Token',
                    decimals: security.decimals || 9,
                    totalSupply: security.current_supply || 0,
                    holders: [],
                };
            }

            const balance = Number(item.balance);
            const percentage = security.current_supply && security.current_supply > 0
                ? (balance / security.current_supply) * 100
                : 0;

            holdingsByToken[mintAddress].holders.push({
                walletAddress: item.wallet_address,
                balance: balance,
                percentage: parseFloat(percentage.toFixed(4)),
            });
        });

        // Convert to array
        const allHoldings = Object.values(holdingsByToken);

        console.log('[Holdings] Transformed all holdings:', allHoldings);

        return res.json({
            success: true,
            holdings: allHoldings,
            count: allHoldings.length,
        });
    } catch (error) {
        console.error('[Holdings] Error fetching all token holdings:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

