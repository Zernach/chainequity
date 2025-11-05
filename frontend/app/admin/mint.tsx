import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Card, Button, Input, AlertModal, WalletAddress, Badge } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';
import { useAlertModal, useSecurities } from '../../hooks';
import type { AllowlistEntry } from '../../services/types';

/**
 * Token Minting Screen
 * Mint tokens to approved wallets
 */
export default function MintTokens() {
    const [tokenMint, setTokenMint] = useState('');
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingAllowlist, setLoadingAllowlist] = useState(false);
    const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
    const [showSecuritiesDropdown, setShowSecuritiesDropdown] = useState(false);
    const { alertState, hideAlert, error, success, confirm } = useAlertModal();
    const { securities, loading: loadingSecurities, refetch: refetchSecurities } = useSecurities();

    // Load allowlist when token is selected
    useEffect(() => {
        const loadAllowlist = async () => {
            if (!tokenMint) {
                setAllowlist([]);
                return;
            }

            setLoadingAllowlist(true);
            try {
                const result = await api.getAllowlist(tokenMint);
                if (result.success) {
                    // Filter to only show approved wallets
                    const approvedWallets = (result.allowlist || []).filter(
                        entry => entry.status === 'approved'
                    );
                    setAllowlist(approvedWallets);
                }
            } catch (err) {
                console.error('Error loading allowlist:', err);
                setAllowlist([]);
            } finally {
                setLoadingAllowlist(false);
            }
        };

        loadAllowlist();
    }, [tokenMint]);

    const mintTokens = async () => {
        if (!tokenMint || !recipient || !amount) {
            error('Error', 'All fields are required');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            error('Error', 'Amount must be a positive number');
            return;
        }

        confirm(
            'Confirm Minting',
            `Mint ${amount} tokens to ${recipient.slice(0, 8)}...?`,
            async () => {
                setLoading(true);
                try {
                    const result = await api.mintTokens({
                        token_mint: tokenMint,
                        wallet_address: recipient,
                        amount: Math.floor(parsedAmount * Math.pow(10, 9)).toString(), // Convert to lamports
                    });

                    if (result.success) {
                        success(
                            'Success',
                            `Minted ${amount} tokens successfully!\n\nSignature: ${result.signature}`
                        );
                        // Clear form
                        setAmount('');
                        setRecipient('');
                    } else {
                        error('Error', result.error || 'Failed to mint tokens');
                    }
                } catch (err) {
                    error('Error', (err as Error).message);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    return (
        <>
            <AlertModal
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                buttons={alertState.buttons}
                onClose={hideAlert}
            />
            <ScrollView style={styles.container}>
                <Card>
                    <Text style={styles.title}>Mint Tokens</Text>
                    <Text style={styles.description}>
                        Mint tokens to approved wallet addresses
                    </Text>
                </Card>

                <Card>
                    <Text style={styles.sectionTitle}>Token Configuration</Text>

                    {/* Security Selector */}
                    {loadingSecurities ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={theme.colors.primary.default} />
                            <Text style={styles.loadingText}>Loading securities...</Text>
                        </View>
                    ) : securities.length > 0 ? (
                        <View style={styles.securitySelector}>
                            <Text style={styles.inputLabel}>Select Token</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.securityList}
                            >
                                {securities.map((security) => (
                                    <TouchableOpacity
                                        key={security.id}
                                        style={[
                                            styles.securityOption,
                                            tokenMint === security.mint_address && styles.securityOptionSelected,
                                        ]}
                                        onPress={() => {
                                            setTokenMint(security.mint_address);
                                            setShowSecuritiesDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.securitySymbol,
                                            tokenMint === security.mint_address && styles.securitySymbolSelected,
                                        ]}>
                                            {security.symbol}
                                        </Text>
                                        <Text style={[
                                            styles.securityName,
                                            tokenMint === security.mint_address && styles.securityNameSelected,
                                        ]}>
                                            {security.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <Button
                                title="↻ Refresh Securities"
                                onPress={refetchSecurities}
                                variant="secondary"
                                style={styles.refreshButton}
                            />
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>
                                No securities found. Initialize a token first.
                            </Text>
                            <Button
                                title="↻ Refresh"
                                onPress={refetchSecurities}
                                variant="secondary"
                                style={styles.refreshButton}
                            />
                        </View>
                    )}

                    {/* Manual Entry (fallback) */}
                    {tokenMint && (
                        <View style={styles.selectedMintContainer}>
                            <Text style={styles.selectedMintLabel}>Selected Mint:</Text>
                            <Text style={styles.selectedMintAddress} numberOfLines={1}>
                                {tokenMint}
                            </Text>
                        </View>
                    )}
                </Card>

                <Card>
                    <Text style={styles.sectionTitle}>Select Recipient</Text>
                    {!tokenMint ? (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>
                                ⚠️ Please select a token above first
                            </Text>
                        </View>
                    ) : loadingAllowlist ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={theme.colors.primary.default} />
                            <Text style={styles.loadingText}>Loading approved wallets...</Text>
                        </View>
                    ) : allowlist.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>
                                No approved wallets found. Add wallets to the allowlist first.
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.helpText}>
                                Select a recipient from the approved wallets:
                            </Text>
                            <FlatList
                                data={allowlist}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.walletOption,
                                            recipient === item.wallet_address && styles.walletOptionSelected,
                                        ]}
                                        onPress={() => setRecipient(item.wallet_address)}
                                    >
                                        <View style={styles.walletInfo}>
                                            <WalletAddress address={item.wallet_address} />
                                            <Badge variant="success">Approved</Badge>
                                        </View>
                                        {recipient === item.wallet_address && (
                                            <Text style={styles.selectedCheckmark}>✓</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                                keyExtractor={(item) => item.wallet_address}
                                scrollEnabled={false}
                                style={styles.walletList}
                            />
                            <Text style={styles.orText}>OR</Text>
                            <Input
                                label="Manual Entry (if not in list)"
                                value={recipient}
                                onChangeText={setRecipient}
                                placeholder="Enter recipient wallet address"
                            />
                        </>
                    )}
                </Card>

                {tokenMint && recipient && (
                    <Card>
                        <Text style={styles.sectionTitle}>Minting Details</Text>
                        <View style={styles.recipientSummary}>
                            <Text style={styles.recipientLabel}>Selected Recipient:</Text>
                            <WalletAddress address={recipient} />
                        </View>
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
                        <Button
                            title="Mint Tokens"
                            onPress={mintTokens}
                            loading={loading}
                            variant="success"
                        />
                    </Card>
                )}

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
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    title: {
        fontSize: theme.typography.fontSize['2xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    description: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    infoBox: {
        backgroundColor: theme.colors.warning.bg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning.default,
        padding: theme.spacing.md,
        marginVertical: theme.spacing.md,
        borderRadius: 4,
    },
    infoText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.primary,
    },
    stepContainer: {
        marginTop: theme.spacing.sm,
    },
    stepText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.sm,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    loadingText: {
        marginLeft: theme.spacing.sm,
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
    },
    securitySelector: {
        marginBottom: theme.spacing.md,
    },
    inputLabel: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
    },
    securityList: {
        marginBottom: theme.spacing.sm,
    },
    securityOption: {
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 2,
        borderColor: theme.colors.border.default,
        borderRadius: 8,
        padding: theme.spacing.md,
        marginRight: theme.spacing.sm,
        minWidth: 120,
    },
    securityOptionSelected: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: theme.colors.primary.default,
    },
    securitySymbol: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    securitySymbolSelected: {
        color: theme.colors.primary.default,
    },
    securityName: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
    },
    securityNameSelected: {
        color: theme.colors.primary.dark,
    },
    refreshButton: {
        marginTop: theme.spacing.sm,
    },
    emptyState: {
        padding: theme.spacing.lg,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    selectedMintContainer: {
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        borderRadius: 8,
        padding: theme.spacing.md,
        marginTop: theme.spacing.sm,
    },
    selectedMintLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
    },
    selectedMintAddress: {
        fontSize: theme.typography.fontSize.sm,
        fontFamily: 'monospace',
        color: theme.colors.text.primary,
    },
    warningBox: {
        padding: theme.spacing.md,
        backgroundColor: '#FFF3CD',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFC107',
    },
    warningText: {
        fontSize: theme.typography.fontSize.base,
        color: '#856404',
        textAlign: 'center',
    },
    helpText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.md,
    },
    walletList: {
        marginBottom: theme.spacing.md,
    },
    walletOption: {
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 2,
        borderColor: theme.colors.border.default,
        borderRadius: 8,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    walletOptionSelected: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: theme.colors.success.default,
    },
    walletInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    selectedCheckmark: {
        fontSize: 24,
        color: theme.colors.success.default,
        fontWeight: 'bold',
        marginLeft: theme.spacing.sm,
    },
    orText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginVertical: theme.spacing.md,
        fontWeight: theme.typography.fontWeight.semibold,
    },
    recipientSummary: {
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        borderRadius: 8,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    recipientLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
        fontWeight: theme.typography.fontWeight.medium,
    },
});

