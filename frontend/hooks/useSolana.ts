/**
 * Solana transaction monitoring and balance fetching
 */

import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { TokenBalance } from '../services/types';

export function useSolana() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const getBalance = useCallback(
        async (tokenMint: string, walletAddress: string): Promise<TokenBalance | null> => {
            setLoading(true);
            setError(null);

            try {
                const response = await api.getBalance(tokenMint, walletAddress);
                if (response.success && response.balance) {
                    return response.balance;
                }
                return null;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                console.error('[useSolana] getBalance error:', error);
                return null;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const checkAllowlistStatus = useCallback(
        async (tokenMint: string, walletAddress: string) => {
            setLoading(true);
            setError(null);

            try {
                const response = await api.checkAllowlistStatus(tokenMint, walletAddress);
                return response.success ? response.entry : null;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                console.error('[useSolana] checkAllowlistStatus error:', error);
                return null;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const getTokenInfo = useCallback(async (tokenMint: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.getTokenInfo(tokenMint);
            return response.success ? response.token : null;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error('[useSolana] getTokenInfo error:', error);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        getBalance,
        checkAllowlistStatus,
        getTokenInfo,
    };
}

