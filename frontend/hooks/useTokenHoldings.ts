/**
 * Hook to fetch and manage user token holdings
 */

import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface TokenHolding {
    mint: string;
    symbol: string;
    name: string;
    balance: string;
    decimals: number;
    percentage?: number;
}

export function useTokenHoldings(walletAddress: string | null, autoRefresh = true) {
    const [holdings, setHoldings] = useState<TokenHolding[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHoldings = async () => {
        if (!walletAddress) {
            console.log('[useTokenHoldings] No wallet address provided');
            setHoldings([]);
            return;
        }

        console.log('[useTokenHoldings] Fetching holdings for wallet:', walletAddress);
        setLoading(true);
        setError(null);

        try {
            const response = await api.getWalletHoldings(walletAddress);
            console.log('[useTokenHoldings] Holdings fetched:', response);

            if (response.success && response.holdings) {
                setHoldings(response.holdings);
            } else {
                setHoldings([]);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch holdings';
            console.error('[useTokenHoldings] Error fetching holdings:', errorMessage);
            setError(errorMessage);
            setHoldings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHoldings();

        if (autoRefresh && walletAddress) {
            const interval = setInterval(fetchHoldings, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [walletAddress, autoRefresh]);

    return {
        holdings,
        loading,
        error,
        refetch: fetchHoldings,
    };
}

