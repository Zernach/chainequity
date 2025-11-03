import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants';

interface LoadingSpinnerProps {
    size?: 'small' | 'large';
    color?: string;
    message?: string;
    style?: ViewStyle;
}

export default function LoadingSpinner({
    size = 'large',
    color = theme.colors.primary.default,
    message,
    style,
}: LoadingSpinnerProps) {
    return (
        <View style={[styles.container, style]}>
            <ActivityIndicator size={size} color={color} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    message: {
        marginTop: theme.spacing.md,
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
    },
});

