/**
 * API calls with error handling and loading states
 */

import { useState, useCallback } from 'react';

interface UseApiOptions<T> {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
}

export function useApi<T = any, A extends any[] = any[]>(
    apiFunction: (...args: A) => Promise<T>,
    options?: UseApiOptions<T>
) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<T | null>(null);

    const execute = useCallback(
        async (...args: A) => {
            setLoading(true);
            setError(null);

            try {
                const result = await apiFunction(...args);
                setData(result);
                options?.onSuccess?.(result);
                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                options?.onError?.(error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [apiFunction, options]
    );

    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setData(null);
    }, []);

    return {
        loading,
        error,
        data,
        execute,
        reset,
    };
}

