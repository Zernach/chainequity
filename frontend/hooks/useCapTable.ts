/**
 * Cap table data fetching and refresh
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import type { CapTableResponse } from '../services/types';

interface UseCapTableOptions {
    tokenMint: string;
    blockHeight?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
}

export function useCapTable({
    tokenMint,
    blockHeight,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
}: UseCapTableOptions) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<CapTableResponse | null>(null);

    const fetchCapTable = useCallback(async () => {
        if (!tokenMint) return;

        setLoading(true);
        setError(null);

        try {
            const response = await api.getCapTable(tokenMint, blockHeight);
            if (response.success) {
                setData(response);
            } else {
                throw new Error(response.error || 'Failed to fetch cap table');
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error('[useCapTable] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [tokenMint, blockHeight]);

    const exportCapTable = useCallback(
        async (format: 'csv' | 'json' = 'csv') => {
            if (!tokenMint) return null;

            try {
                const response = await api.exportCapTable(tokenMint, format);
                return response.success ? response.data : null;
            } catch (err) {
                console.error('[useCapTable] Export error:', err);
                return null;
            }
        },
        [tokenMint]
    );

    const refresh = useCallback(() => {
        fetchCapTable();
    }, [fetchCapTable]);

    // Initial fetch
    useEffect(() => {
        fetchCapTable();
    }, [fetchCapTable]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchCapTable();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchCapTable]);

    return {
        loading,
        error,
        data,
        refresh,
        exportCapTable,
    };
}

