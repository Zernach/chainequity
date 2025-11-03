import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants';

interface SeparatorProps {
    style?: ViewStyle;
    vertical?: boolean;
    spacing?: number;
}

export default function Separator({ style, vertical = false, spacing }: SeparatorProps) {
    return (
        <View
            style={[
                vertical ? styles.vertical : styles.horizontal,
                spacing && (vertical ? { marginHorizontal: spacing } : { marginVertical: spacing }),
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    horizontal: {
        height: 1,
        backgroundColor: theme.colors.border.default,
        marginVertical: theme.spacing.md,
    },
    vertical: {
        width: 1,
        backgroundColor: theme.colors.border.default,
        marginHorizontal: theme.spacing.md,
    },
});

