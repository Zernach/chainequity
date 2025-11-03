/**
 * Token minting, transfer, and approval operations
 */

import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type {
    ApproveWalletRequest,
    MintTokenRequest,
    StockSplitRequest,
    ChangeSymbolRequest,
} from '../services/types';

export function useTokenOperations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const approveWallet = useCallback(async (data: ApproveWalletRequest) => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.approveWallet(data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to approve wallet');
            }
            return response;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const revokeWallet = useCallback(
        async (tokenMint: string, walletAddress: string) => {
            setLoading(true);
            setError(null);

            try {
                const response = await api.revokeWallet(tokenMint, walletAddress);
                if (!response.success) {
                    throw new Error('Failed to revoke wallet');
                }
                return response;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const mintTokens = useCallback(async (data: MintTokenRequest) => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.mintTokens(data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to mint tokens');
            }
            return response;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const executeStockSplit = useCallback(async (data: StockSplitRequest) => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.executeStockSplit(data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to execute stock split');
            }
            return response;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const changeSymbol = useCallback(async (data: ChangeSymbolRequest) => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.changeSymbol(data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to change symbol');
            }
            return response;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const initializeToken = useCallback(
        async (symbol: string, name: string, decimals: number = 9) => {
            setLoading(true);
            setError(null);

            try {
                const response = await api.initializeToken(symbol, name, decimals);
                if (!response.success) {
                    throw new Error('Failed to initialize token');
                }
                return response;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    return {
        loading,
        error,
        approveWallet,
        revokeWallet,
        mintTokens,
        executeStockSplit,
        changeSymbol,
        initializeToken,
    };
}

