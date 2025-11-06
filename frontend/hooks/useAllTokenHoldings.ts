/**
 * Hook to fetch all token holdings across all wallets (admin only)
 */

import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface TokenHoldingsByToken {
    mint: string;
    symbol: string;
    name: string;
    decimals: number;
    totalSupply: number;
    holders: Array<{
        walletAddress: string;
        balance: number;
        percentage: number;
    }>;
}

export function useAllTokenHoldings(autoRefresh = true) {
    const [holdings, setHoldings] = useState<TokenHoldingsByToken[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHoldings = async () => {
        console.log('[useAllTokenHoldings] Fetching all token holdings');
        setLoading(true);
        setError(null);

        try {
            const response = await api.getAllTokenHoldings();
            console.log('[useAllTokenHoldings] Holdings fetched:', response);

            if (response.success && response.holdings) {
                setHoldings(response.holdings);
            } else {
                setHoldings([]);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all holdings';
            console.error('[useAllTokenHoldings] Error fetching holdings:', errorMessage);
            setError(errorMessage);
            setHoldings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHoldings();

        if (autoRefresh) {
            const interval = setInterval(fetchHoldings, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    return {
        holdings,
        loading,
        error,
        refetch: fetchHoldings,
    };
}

