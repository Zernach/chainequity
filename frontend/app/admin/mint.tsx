import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Button, Input } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';

/**
 * Token Minting Screen
 * Mint tokens to approved wallets
 */
export default function MintTokens() {
    const [tokenMint, setTokenMint] = useState('');
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const mintTokens = async () => {
        if (!tokenMint || !recipient || !amount) {
            Alert.alert('Error', 'All fields are required');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Error', 'Amount must be a positive number');
            return;
        }

        Alert.alert(
            'Confirm Minting',
            `Mint ${amount} tokens to ${recipient.slice(0, 8)}...?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mint',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const result = await api.mintTokens({
                                tokenMint,
                                recipient,
                                amount: Math.floor(parsedAmount * Math.pow(10, 9)), // Convert to lamports
                            });

                            if (result.success) {
                                Alert.alert(
                                    'Success',
                                    `Minted ${amount} tokens successfully!\n\nSignature: ${result.signature}`,
                                    [{ text: 'OK' }]
                                );
                                // Clear form
                                setAmount('');
                                setRecipient('');
                            } else {
                                Alert.alert('Error', result.error || 'Failed to mint tokens');
                            }
                        } catch (error) {
                            Alert.alert('Error', (error as Error).message);
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <Card>
                <Text style={styles.title}>Mint Tokens</Text>
                <Text style={styles.description}>
                    Mint tokens to approved wallet addresses
                </Text>
            </Card>

            <Card>
                <Text style={styles.sectionTitle}>Token Configuration</Text>
                <Input
                    label="Token Mint Address"
                    value={tokenMint}
                    onChangeText={setTokenMint}
                    placeholder="Enter token mint address"
                />
            </Card>

            <Card>
                <Text style={styles.sectionTitle}>Minting Details</Text>
                <Input
                    label="Recipient Wallet Address"
                    value={recipient}
                    onChangeText={setRecipient}
                    placeholder="Enter recipient wallet address"
                />
                <Input
                    label="Amount (tokens)"
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="e.g., 1000"
                    keyboardType="numeric"
                />
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        ⚠️ The recipient wallet must be on the allowlist before minting.
                    </Text>
                </View>
                <Button onPress={mintTokens} loading={loading} variant="success">
                    Mint Tokens
                </Button>
            </Card>

            <Card>
                <Text style={styles.sectionTitle}>How to Mint Tokens</Text>
                <View style={styles.stepContainer}>
                    <Text style={styles.stepText}>1. Enter the token mint address</Text>
                    <Text style={styles.stepText}>2. Verify recipient is on allowlist</Text>
                    <Text style={styles.stepText}>3. Enter amount in whole tokens (not lamports)</Text>
                    <Text style={styles.stepText}>4. Click "Mint Tokens" to execute</Text>
                    <Text style={styles.stepText}>5. Transaction will be confirmed on-chain</Text>
                </View>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    title: {
        ...theme.typography.h2,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    description: {
        ...theme.typography.body,
        color: theme.colors.text.secondary,
    },
    sectionTitle: {
        ...theme.typography.h3,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    infoBox: {
        backgroundColor: theme.colors.warning + '20',
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
        padding: theme.spacing.md,
        marginVertical: theme.spacing.md,
        borderRadius: 4,
    },
    infoText: {
        ...theme.typography.small,
        color: theme.colors.text.primary,
    },
    stepContainer: {
        marginTop: theme.spacing.sm,
    },
    stepText: {
        ...theme.typography.body,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.sm,
    },
});

