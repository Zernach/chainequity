import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Toast, { ToastData, ToastVariant } from '../components/Toast';
import { theme } from '../constants';

interface ToastContextValue {
    showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    dismiss: (id: string) => void;
    dismissAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
    children: ReactNode;
    maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 3 }: ToastProviderProps) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, variant: ToastVariant = 'info', duration: number = 4000) => {
            const id = `toast-${Date.now()}-${Math.random()}`;
            const newToast: ToastData = {
                id,
                message,
                variant,
                duration,
            };

            setToasts((prev) => {
                // Limit number of toasts displayed at once
                const updated = [...prev, newToast];
                return updated.slice(-maxToasts);
            });
        },
        [maxToasts]
    );

    const success = useCallback(
        (message: string, duration?: number) => {
            showToast(message, 'success', duration);
        },
        [showToast]
    );

    const error = useCallback(
        (message: string, duration?: number) => {
            showToast(message, 'error', duration);
        },
        [showToast]
    );

    const warning = useCallback(
        (message: string, duration?: number) => {
            showToast(message, 'warning', duration);
        },
        [showToast]
    );

    const info = useCallback(
        (message: string, duration?: number) => {
            showToast(message, 'info', duration);
        },
        [showToast]
    );

    const dismiss = useCallback((id: string) => {
        removeToast(id);
    }, [removeToast]);

    const dismissAll = useCallback(() => {
        setToasts([]);
    }, []);

    const value: ToastContextValue = {
        showToast,
        success,
        error,
        warning,
        info,
        dismiss,
        dismissAll,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toasts.length > 0 && (
                <View style={styles.container} pointerEvents="box-none">
                    {toasts.map((toast) => (
                        <Toast
                            key={toast.id}
                            {...toast}
                            onRemove={removeToast}
                        />
                    ))}
                </View>
            )}
        </ToastContext.Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.select({
            ios: 60,      // Account for status bar + safe area
            android: 40,  // Account for status bar
            web: 20,      // Standard top margin
            default: 40,
        }),
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: 'box-none',
    },
});

