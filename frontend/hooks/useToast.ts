import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

/**
 * Hook to access the global toast notification system
 * 
 * @example
 * ```tsx
 * const toast = useToast();
 * 
 * // Show different types of toasts
 * toast.success('Operation completed!');
 * toast.error('Something went wrong');
 * toast.warning('Please be careful');
 * toast.info('Here\'s some information');
 * 
 * // Custom duration (default is 4000ms)
 * toast.success('This will stay longer', 6000);
 * 
 * // Generic toast with custom variant
 * toast.showToast('Custom message', 'success', 5000);
 * ```
 */
export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }

    return context;
}

