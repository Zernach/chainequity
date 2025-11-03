import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { theme } from '../constants';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export default function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    style,
    textStyle,
}: ButtonProps) {
    const isDisabled = disabled || loading;

    const buttonStyle: ViewStyle[] = [
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
    ];

    const textStyleCombined: TextStyle[] = [
        styles.text,
        styles[`text_${size}`],
        styles[`text_${variant}`],
        textStyle,
    ];

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={theme.opacity.pressed}
        >
            {loading ? (
                <ActivityIndicator
                    color={getLoaderColor(variant)}
                    size={size === 'sm' ? 'small' : 'small'}
                />
            ) : (
                <Text style={textStyleCombined}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

function getLoaderColor(variant: ButtonVariant): string {
    switch (variant) {
        case 'ghost':
            return theme.colors.primary.default;
        default:
            return theme.colors.primary.contrast;
    }
}

const styles = StyleSheet.create({
    base: {
        borderRadius: theme.radius.base,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    fullWidth: {
        width: '100%',
    },

    // Sizes
    size_sm: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        minHeight: 32,
    },
    size_md: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.base,
        minHeight: 44,
    },
    size_lg: {
        paddingVertical: theme.spacing.base,
        paddingHorizontal: theme.spacing.lg,
        minHeight: 52,
    },

    // Variants
    variant_primary: {
        backgroundColor: theme.colors.primary.default,
    },
    variant_secondary: {
        backgroundColor: theme.colors.secondary.default,
    },
    variant_danger: {
        backgroundColor: theme.colors.error.default,
    },
    variant_success: {
        backgroundColor: theme.colors.success.default,
    },
    variant_ghost: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },

    // Disabled state
    disabled: {
        opacity: theme.opacity.disabled,
    },

    // Text styles
    text: {
        fontWeight: theme.typography.fontWeight.semibold,
    },
    text_sm: {
        fontSize: theme.typography.fontSize.sm,
    },
    text_md: {
        fontSize: theme.typography.fontSize.md,
    },
    text_lg: {
        fontSize: theme.typography.fontSize.lg,
    },
    text_primary: {
        color: theme.colors.primary.contrast,
    },
    text_secondary: {
        color: theme.colors.secondary.contrast,
    },
    text_danger: {
        color: theme.colors.error.contrast,
    },
    text_success: {
        color: theme.colors.success.contrast,
    },
    text_ghost: {
        color: theme.colors.text.primary,
    },
});

