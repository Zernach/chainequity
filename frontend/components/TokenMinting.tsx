import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';

interface MintResult {
    success: boolean;
    signature?: string;
    network?: string;
    error?: string;
    [key: string]: any;
}

interface TokenMintingProps {
    onMint: () => void;
    loading: boolean;
    result: MintResult | null;
}

export function TokenMinting({ onMint, loading, result }: TokenMintingProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Solana Token Minting</Text>
            <TouchableOpacity style={styles.buttonPrimary} onPress={onMint} disabled={loading}>
                <Text style={styles.buttonText}>Mint 1 SOL (Devnet)</Text>
            </TouchableOpacity>
            {result && (
                <View style={styles.resultBox}>
                    <Text style={styles.resultTitle}>
                        {result.success ? '✅ Success' : '❌ Failed'}
                    </Text>
                    <Text style={styles.resultText}>{JSON.stringify(result, null, 2)}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginVertical: 12,
        padding: 16,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: theme.colors.text.primary,
    },
    buttonPrimary: {
        backgroundColor: theme.colors.success.default,
        padding: 14,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 8,
    },
    buttonText: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    resultBox: {
        backgroundColor: theme.colors.background.tertiary,
        padding: 12,
        borderRadius: 6,
        marginTop: 12,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    resultTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: theme.colors.text.primary,
    },
    resultText: {
        fontSize: 11,
        color: theme.colors.text.secondary,
        fontFamily: 'monospace',
    },
});

