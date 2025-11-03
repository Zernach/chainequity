import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
    title?: string;
    message: string;
    variant?: AlertVariant;
    style?: ViewStyle;
}

export default function Alert({
    title,
    message,
    variant = 'info',
    style,
}: AlertProps) {
    return (
        <View style={[styles.container, styles[`container_${variant}`], style]}>
            {title && <Text style={[styles.title, styles[`title_${variant}`]]}>{title}</Text>}
            <Text style={[styles.message, styles[`message_${variant}`]]}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: theme.spacing.base,
        borderRadius: theme.radius.base,
        borderLeftWidth: 4,
    },
    title: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.semibold,
        marginBottom: theme.spacing.xs,
    },
    message: {
        fontSize: theme.typography.fontSize.sm,
        lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.sm,
    },

    // Success variant
    container_success: {
        backgroundColor: theme.colors.success.bg,
        borderLeftColor: theme.colors.success.default,
    },
    title_success: {
        color: theme.colors.success.default,
    },
    message_success: {
        color: theme.colors.success.default,
    },

    // Error variant
    container_error: {
        backgroundColor: theme.colors.error.bg,
        borderLeftColor: theme.colors.error.default,
    },
    title_error: {
        color: theme.colors.error.default,
    },
    message_error: {
        color: theme.colors.error.default,
    },

    // Warning variant
    container_warning: {
        backgroundColor: theme.colors.warning.bg,
        borderLeftColor: theme.colors.warning.default,
    },
    title_warning: {
        color: theme.colors.warning.default,
    },
    message_warning: {
        color: theme.colors.warning.default,
    },

    // Info variant
    container_info: {
        backgroundColor: theme.colors.info.bg,
        borderLeftColor: theme.colors.info.default,
    },
    title_info: {
        color: theme.colors.info.default,
    },
    message_info: {
        color: theme.colors.info.default,
    },
});

