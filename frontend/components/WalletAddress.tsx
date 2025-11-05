import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../constants';

interface WalletAddressProps {
    address: string;
    label?: string;
    showFull?: boolean;
    truncateLength?: number;
    style?: ViewStyle;
}

export default function WalletAddress({
    address,
    label,
    showFull = false,
    truncateLength = 8,
    style,
}: WalletAddressProps) {
    const [copied, setCopied] = useState(false);

    const displayAddress = showFull
        ? address
        : `${address.slice(0, truncateLength)}...${address.slice(-truncateLength)}`;

    const handleCopy = async () => {
        await Clipboard.setStringAsync(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TouchableOpacity
                style={[
                    styles.addressContainer,
                    copied && styles.addressContainerCopied
                ]}
                onPress={handleCopy}
                activeOpacity={theme.opacity.hover}
            >
                <Text style={styles.address}>{displayAddress}</Text>
                <Text style={styles.copyIcon}>{copied ? '✓' : '📋'}</Text>
            </TouchableOpacity>
            {copied && (
                <Text style={styles.copiedText}>Copied to clipboard!</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: theme.spacing.xs,
    },
    label: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
        textTransform: 'uppercase',
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.secondary,
        padding: theme.spacing.sm,
        borderRadius: theme.radius.base,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    address: {
        flex: 1,
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.primary,
        fontFamily: 'monospace',
    },
    copyIcon: {
        marginLeft: theme.spacing.sm,
        fontSize: theme.typography.fontSize.md,
    },
    addressContainerCopied: {
        borderColor: theme.colors.success.default,
        backgroundColor: theme.colors.success.bg,
    },
    copiedText: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.success.default,
        marginTop: theme.spacing.xs,
        textAlign: 'center',
    },
});

