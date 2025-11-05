/**
 * Hook to fetch and manage securities (initialized tokens)
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface Security {
    id: string;
    mint_address: string;
    symbol: string;
    name: string;
    decimals: number;
    total_supply: number;
    current_supply: number;
    program_id: string;
    is_active: boolean;
    created_at: string;
}

export function useSecurities(autoLoad = true) {
    const [securities, setSecurities] = useState<Security[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSecurities = useCallback(async () => {
        console.log('[useSecurities] Fetching securities');
        setLoading(true);
        setError(null);

        try {
            const result = await api.getAllSecurities();
            console.log('[useSecurities] Securities fetched:', result);

            if (result.success && result.securities) {
                setSecurities(result.securities);
            } else {
                setSecurities([]);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch securities';
            console.error('[useSecurities] Error fetching securities:', errorMessage);
            setError(errorMessage);
            setSecurities([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (autoLoad) {
            fetchSecurities();
        }
    }, [autoLoad, fetchSecurities]);

    return {
        securities,
        loading,
        error,
        refetch: fetchSecurities,
    };
}

