import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants';

type BadgeVariant =
    | 'approved'
    | 'pending'
    | 'rejected'
    | 'connected'
    | 'disconnected'
    | 'success'
    | 'error'
    | 'warning'
    | 'info'
    | 'default';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    style?: ViewStyle;
}

export default function Badge({ label, variant = 'default', style }: BadgeProps) {
    return (
        <View style={[styles.badge, styles[`badge_${variant}`], style]}>
            <Text style={[styles.text, styles[`text_${variant}`]]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.full,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.semibold,
        textTransform: 'uppercase',
    },

    // Variants
    badge_default: {
        backgroundColor: theme.colors.overlay.medium,
    },
    text_default: {
        color: theme.colors.text.secondary,
    },

    badge_approved: {
        backgroundColor: theme.colors.success.bg,
    },
    text_approved: {
        color: theme.colors.success.default,
    },

    badge_pending: {
        backgroundColor: theme.colors.warning.bg,
    },
    text_pending: {
        color: theme.colors.warning.default,
    },

    badge_rejected: {
        backgroundColor: theme.colors.error.bg,
    },
    text_rejected: {
        color: theme.colors.error.default,
    },

    badge_connected: {
        backgroundColor: theme.colors.success.bg,
    },
    text_connected: {
        color: theme.colors.success.default,
    },

    badge_disconnected: {
        backgroundColor: theme.colors.error.bg,
    },
    text_disconnected: {
        color: theme.colors.error.default,
    },

    badge_success: {
        backgroundColor: theme.colors.success.bg,
    },
    text_success: {
        color: theme.colors.success.default,
    },

    badge_error: {
        backgroundColor: theme.colors.error.bg,
    },
    text_error: {
        color: theme.colors.error.default,
    },

    badge_warning: {
        backgroundColor: theme.colors.warning.bg,
    },
    text_warning: {
        color: theme.colors.warning.default,
    },

    badge_info: {
        backgroundColor: theme.colors.info.bg,
    },
    text_info: {
        color: theme.colors.info.default,
    },
});

