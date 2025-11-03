import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, ViewStyle } from 'react-native';
import { theme } from '../constants';
import Badge from './Badge';

interface TransactionStatusProps {
    signature: string;
    status?: 'pending' | 'confirmed' | 'failed';
    network?: 'devnet' | 'testnet' | 'mainnet-beta';
    timestamp?: string;
    style?: ViewStyle;
}

export default function TransactionStatus({
    signature,
    status = 'confirmed',
    network = 'devnet',
    timestamp,
    style,
}: TransactionStatusProps) {
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;

    const handleOpenExplorer = () => {
        Linking.openURL(explorerUrl);
    };

    const getStatusVariant = () => {
        switch (status) {
            case 'confirmed':
                return 'success';
            case 'failed':
                return 'error';
            case 'pending':
                return 'warning';
            default:
                return 'info';
        }
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.header}>
                <Text style={styles.label}>Transaction</Text>
                <Badge label={status} variant={getStatusVariant()} />
            </View>

            <TouchableOpacity
                style={styles.signatureContainer}
                onPress={handleOpenExplorer}
                activeOpacity={theme.opacity.hover}
            >
                <Text style={styles.signature} numberOfLines={1}>
                    {signature}
                </Text>
                <Text style={styles.externalIcon}>🔗</Text>
            </TouchableOpacity>

            {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.background.secondary,
        padding: theme.spacing.md,
        borderRadius: theme.radius.base,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    label: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.secondary,
        textTransform: 'uppercase',
        fontWeight: theme.typography.fontWeight.semibold,
    },
    signatureContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.primary,
        padding: theme.spacing.sm,
        borderRadius: theme.radius.sm,
    },
    signature: {
        flex: 1,
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.link,
        fontFamily: 'monospace',
    },
    externalIcon: {
        marginLeft: theme.spacing.sm,
        fontSize: theme.typography.fontSize.md,
    },
    timestamp: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.tertiary,
        marginTop: theme.spacing.sm,
    },
});

