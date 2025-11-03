import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    ViewStyle,
} from 'react-native';
import { theme } from '../constants';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export default function Input({
    label,
    error,
    containerStyle,
    style,
    ...props
}: InputProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    isFocused && styles.inputFocused,
                    error && styles.inputError,
                    style,
                ]}
                placeholderTextColor={theme.colors.text.placeholder}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
    },
    input: {
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        borderRadius: theme.radius.base,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.base,
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.text.primary,
        minHeight: 44,
    },
    inputFocused: {
        borderColor: theme.colors.border.focus,
        borderWidth: 2,
    },
    inputError: {
        borderColor: theme.colors.border.error,
    },
    errorText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.error.default,
        marginTop: theme.spacing.xs,
    },
});

