import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    elevated?: boolean;
    noPadding?: boolean;
}

export default function Card({
    children,
    style,
    elevated = false,
    noPadding = false,
}: CardProps) {
    return (
        <View
            style={[
                styles.card,
                elevated && styles.elevated,
                !noPadding && styles.padding,
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface.default,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    padding: {
        padding: theme.spacing.base,
    },
    elevated: {
        backgroundColor: theme.colors.surface.elevated,
        ...theme.shadow.md,
    },
});

