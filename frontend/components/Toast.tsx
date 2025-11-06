import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { theme } from '../constants';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
    id: string;
    message: string;
    variant?: ToastVariant;
    duration?: number;
    onDismiss?: () => void;
}

interface ToastProps extends ToastData {
    onRemove: (id: string) => void;
}

export default function Toast({
    id,
    message,
    variant = 'info',
    duration = 4000,
    onDismiss,
    onRemove,
}: ToastProps) {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Slide in animation
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss after duration
        const timer = setTimeout(() => {
            handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        // Slide out animation
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss?.();
            onRemove(id);
        });
    };

    const getIconForVariant = () => {
        switch (variant) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            default:
                return 'ℹ';
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                styles[`container_${variant}`],
                {
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
        >
            <TouchableOpacity
                style={styles.content}
                onPress={handleDismiss}
                activeOpacity={0.9}
            >
                <View style={[styles.iconContainer, styles[`iconContainer_${variant}`]]}>
                    <Text style={[styles.icon, styles[`icon_${variant}`]]}>
                        {getIconForVariant()}
                    </Text>
                </View>
                <Text style={styles.message} numberOfLines={2}>
                    {message}
                </Text>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleDismiss}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.sm,
        borderRadius: theme.radius.lg,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
            web: {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            },
        }),
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        minHeight: 60,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    icon: {
        fontSize: 16,
        fontWeight: theme.typography.fontWeight.bold,
    },
    message: {
        flex: 1,
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.medium,
        lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.base,
    },
    closeButton: {
        padding: theme.spacing.xs,
        marginLeft: theme.spacing.sm,
    },
    closeIcon: {
        fontSize: 16,
        fontWeight: theme.typography.fontWeight.bold,
        opacity: 0.6,
    },

    // Success variant
    container_success: {
        backgroundColor: theme.colors.success.default,
    },
    iconContainer_success: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    icon_success: {
        color: '#fff',
    },

    // Error variant
    container_error: {
        backgroundColor: theme.colors.error.default,
    },
    iconContainer_error: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    icon_error: {
        color: '#fff',
    },

    // Warning variant
    container_warning: {
        backgroundColor: theme.colors.warning.default,
    },
    iconContainer_warning: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    icon_warning: {
        color: '#000',
    },

    // Info variant
    container_info: {
        backgroundColor: theme.colors.info.default,
    },
    iconContainer_info: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    icon_info: {
        color: '#fff',
    },
});

