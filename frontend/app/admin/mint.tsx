import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card, Button, Input, AlertModal, WalletAddress, Badge, CustomList } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';
import { useAlertModal, useSecurities } from '../../hooks';
import type { AllowlistEntry } from '../../services/types';

interface RecipientWithAmount {
    wallet_address: string;
    amount: string;
}

interface WalletBalance {
    balance: string;
    loading: boolean;
    error?: string;
}

/**
 * Token Minting Screen
 * Mint tokens to approved wallets with multi-select capability
 */
export default function MintTokens() {
    const [tokenMint, setTokenMint] = useState('');
    const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
    const [recipientAmounts, setRecipientAmounts] = useState<Map<string, string>>(new Map());
    const [walletBalances, setWalletBalances] = useState<Map<string, WalletBalance>>(new Map());
    const [loading, setLoading] = useState(false);
    const [loadingAllowlist, setLoadingAllowlist] = useState(false);
    const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
    const [showSecuritiesDropdown, setShowSecuritiesDropdown] = useState(false);
    const { alertState, hideAlert, error, success, confirm } = useAlertModal();
    const { securities, loading: loadingSecurities, refetch: refetchSecurities } = useSecurities();

    // Fetch balance for a specific wallet
    const fetchWalletBalance = async (walletAddress: string, mint: string) => {
        if (!mint || !walletAddress) return;

        // Set loading state
        setWalletBalances(prev => new Map(prev).set(walletAddress, {
            balance: '0',
            loading: true,
        }));

        try {
            const result = await api.getBalance(mint, walletAddress);
            if (result.success && result.balance !== undefined) {
                setWalletBalances(prev => new Map(prev).set(walletAddress, {
                    balance: result.balance.amount, // Extract the amount string from TokenBalance object
                    loading: false,
                }));
            } else {
                setWalletBalances(prev => new Map(prev).set(walletAddress, {
                    balance: '0',
                    loading: false,
                    error: 'Failed to fetch balance',
                }));
            }
        } catch (err) {
            console.error('Error fetching balance:', err);
            setWalletBalances(prev => new Map(prev).set(walletAddress, {
                balance: '0',
                loading: false,
                error: err instanceof Error ? err.message : 'Unknown error',
            }));
        }
    };

    // Load allowlist when token is selected
    useEffect(() => {
        const loadAllowlist = async () => {
            if (!tokenMint) {
                setAllowlist([]);
                setSelectedRecipients(new Set());
                setRecipientAmounts(new Map());
                setWalletBalances(new Map());
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

                    // Fetch balances for all approved wallets
                    approvedWallets.forEach(entry => {
                        fetchWalletBalance(entry.wallet_address, tokenMint);
                    });
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

    const toggleRecipient = (walletAddress: string) => {
        const newSelected = new Set(selectedRecipients);
        if (newSelected.has(walletAddress)) {
            newSelected.delete(walletAddress);
            const newAmounts = new Map(recipientAmounts);
            newAmounts.delete(walletAddress);
            setRecipientAmounts(newAmounts);
        } else {
            newSelected.add(walletAddress);
        }
        setSelectedRecipients(newSelected);
    };

    const updateRecipientAmount = (walletAddress: string, amount: string) => {
        const newAmounts = new Map(recipientAmounts);
        newAmounts.set(walletAddress, amount);
        setRecipientAmounts(newAmounts);
    };

    const mintTokens = async () => {
        if (!tokenMint) {
            error('Error', 'Please select a token');
            return;
        }

        if (selectedRecipients.size === 0) {
            error('Error', 'Please select at least one recipient');
            return;
        }

        // Validate all selected recipients have amounts
        const invalidRecipients: string[] = [];
        const recipients: RecipientWithAmount[] = [];

        selectedRecipients.forEach(wallet => {
            const amountStr = recipientAmounts.get(wallet) || '';
            const parsedAmount = parseFloat(amountStr);

            if (!amountStr || isNaN(parsedAmount) || parsedAmount <= 0) {
                invalidRecipients.push(wallet);
            } else {
                recipients.push({
                    wallet_address: wallet,
                    amount: Math.floor(parsedAmount * Math.pow(10, 9)).toString(), // Convert to lamports
                });
            }
        });

        if (invalidRecipients.length > 0) {
            error('Error', `Please enter valid amounts for all selected recipients`);
            return;
        }

        const totalAmount = recipients.reduce((sum, r) => {
            return sum + parseFloat(recipientAmounts.get(r.wallet_address) || '0');
        }, 0);

        confirm(
            'Confirm Batch Minting',
            `Mint tokens to ${recipients.length} wallet(s)?\n\nTotal: ${totalAmount.toFixed(2)} tokens`,
            async () => {
                setLoading(true);
                try {
                    let successCount = 0;
                    let failCount = 0;
                    const results: string[] = [];

                    // Execute minting operations sequentially
                    for (const recipient of recipients) {
                        try {
                            const result = await api.mintTokens({
                                token_mint: tokenMint,
                                wallet_address: recipient.wallet_address,
                                amount: recipient.amount,
                            });

                            if (result.success) {
                                successCount++;
                                results.push(`✓ ${recipient.wallet_address.slice(0, 8)}...`);
                            } else {
                                failCount++;
                                results.push(`✗ ${recipient.wallet_address.slice(0, 8)}... - ${result.error}`);
                            }
                        } catch (err) {
                            failCount++;
                            results.push(`✗ ${recipient.wallet_address.slice(0, 8)}... - ${(err as Error).message}`);
                        }
                    }

                    // Show results
                    if (failCount === 0) {
                        success(
                            'Success',
                            `Minted tokens to ${successCount} wallet(s) successfully!`
                        );
                        // Clear selections
                        setSelectedRecipients(new Set());
                        setRecipientAmounts(new Map());
                    } else if (successCount === 0) {
                        error('Error', `All minting operations failed:\n${results.join('\n')}`);
                    } else {
                        error(
                            'Partial Success',
                            `${successCount} succeeded, ${failCount} failed:\n${results.join('\n')}`
                        );
                        // Clear only successful recipients
                        const newSelected = new Set(selectedRecipients);
                        const newAmounts = new Map(recipientAmounts);
                        recipients.forEach(r => {
                            if (results.find(res => res.startsWith(`✓ ${r.wallet_address.slice(0, 8)}`))) {
                                newSelected.delete(r.wallet_address);
                                newAmounts.delete(r.wallet_address);
                            }
                        });
                        setSelectedRecipients(newSelected);
                        setRecipientAmounts(newAmounts);
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
            <CustomList scrollViewProps={{ style: styles.container }}>
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
                            <CustomList
                                scrollViewProps={{
                                    horizontal: true,
                                    showsHorizontalScrollIndicator: false,
                                    style: styles.securityList,
                                }}
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
                            </CustomList>
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
                    <Text style={styles.sectionTitle}>Select Recipients & Amounts</Text>
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
                                Select recipient(s) and enter amounts for each:
                            </Text>
                            <CustomList
                                flatListProps={{
                                    data: allowlist,
                                    renderItem: ({ item }) => {
                                        const isSelected = selectedRecipients.has(item.wallet_address);
                                        const amount = recipientAmounts.get(item.wallet_address) || '';
                                        const balanceInfo = walletBalances.get(item.wallet_address);

                                        return (
                                            <View style={styles.recipientCard}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.walletOption,
                                                        isSelected && styles.walletOptionSelected,
                                                    ]}
                                                    onPress={() => toggleRecipient(item.wallet_address)}
                                                >
                                                    <View style={styles.walletInfo}>
                                                        <View style={styles.checkboxContainer}>
                                                            <View style={[
                                                                styles.checkbox,
                                                                isSelected && styles.checkboxSelected
                                                            ]}>
                                                                {isSelected && (
                                                                    <Text style={styles.checkboxCheckmark}>✓</Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                        <View style={styles.walletDetails}>
                                                            <WalletAddress address={item.wallet_address} />
                                                            <Badge variant="success">Approved</Badge>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>

                                                {/* Display current balance */}
                                                <View style={styles.balanceContainer}>
                                                    {balanceInfo?.loading ? (
                                                        <View style={styles.balanceRow}>
                                                            <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                                                            <Text style={styles.balanceLabel}>Loading balance...</Text>
                                                        </View>
                                                    ) : balanceInfo?.error ? (
                                                        <Text style={styles.balanceError}>
                                                            ⚠️ Could not fetch balance
                                                        </Text>
                                                    ) : (
                                                        <View style={styles.balanceRow}>
                                                            <Text style={styles.balanceLabel}>Current Balance:</Text>
                                                            <Text style={styles.balanceValue}>
                                                                {balanceInfo?.balance ?
                                                                    (parseFloat(balanceInfo.balance) / Math.pow(10, 9)).toFixed(2)
                                                                    : '0.00'
                                                                } tokens
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {isSelected && (
                                                    <View style={styles.amountInputContainer}>
                                                        <Input
                                                            label="Amount (tokens)"
                                                            value={amount}
                                                            onChangeText={(text) => updateRecipientAmount(item.wallet_address, text)}
                                                            placeholder="e.g., 1000"
                                                            keyboardType="numeric"
                                                            style={styles.amountInput}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    },
                                    keyExtractor: (item) => item.wallet_address,
                                    scrollEnabled: false,
                                    style: styles.walletList,
                                }}
                            />
                        </>
                    )}
                </Card>

                {tokenMint && selectedRecipients.size > 0 && (
                    <Card>
                        <Text style={styles.sectionTitle}>Minting Summary</Text>
                        <View style={styles.summaryContainer}>
                            <Text style={styles.summaryText}>
                                Selected Recipients: {selectedRecipients.size}
                            </Text>
                            {Array.from(selectedRecipients).map(wallet => {
                                const amount = recipientAmounts.get(wallet) || '0';
                                return (
                                    <View key={wallet} style={styles.summaryRow}>
                                        <WalletAddress address={wallet} />
                                        <Text style={styles.summaryAmount}>
                                            {amount ? `${parseFloat(amount).toFixed(2)}` : '—'} tokens
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                ⚠️ All recipient wallets must be on the allowlist. Tokens will be minted sequentially.
                            </Text>
                        </View>
                        <Button
                            title={`Mint to ${selectedRecipients.size} Wallet${selectedRecipients.size > 1 ? 's' : ''}`}
                            onPress={mintTokens}
                            loading={loading}
                            variant="success"
                        />
                    </Card>
                )}

                <Card>
                    <Text style={styles.sectionTitle}>How to Mint Tokens</Text>
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepText}>1. Select a token from the list above</Text>
                        <Text style={styles.stepText}>2. Check the box(es) for recipient wallet(s)</Text>
                        <Text style={styles.stepText}>3. Enter amount for each selected wallet</Text>
                        <Text style={styles.stepText}>4. Review the summary and click "Mint to X Wallets"</Text>
                        <Text style={styles.stepText}>5. Tokens will be minted sequentially to each wallet</Text>
                    </View>
                </Card>
            </CustomList>
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
    recipientCard: {
        marginBottom: theme.spacing.md,
    },
    checkboxContainer: {
        marginRight: theme.spacing.md,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: theme.colors.border.default,
        borderRadius: 4,
        backgroundColor: theme.colors.background.secondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: theme.colors.success.default,
        borderColor: theme.colors.success.default,
    },
    checkboxCheckmark: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    walletDetails: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    amountInputContainer: {
        marginTop: theme.spacing.sm,
        paddingLeft: theme.spacing.lg,
    },
    amountInput: {
        marginBottom: 0,
    },
    summaryContainer: {
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        borderRadius: 8,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    summaryText: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
    },
    summaryAmount: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.success.default,
        marginLeft: theme.spacing.sm,
    },
    balanceContainer: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.background.tertiary,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.default,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    balanceLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        fontWeight: theme.typography.fontWeight.medium,
    },
    balanceValue: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.primary.default,
        fontWeight: theme.typography.fontWeight.semibold,
    },
    balanceError: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.error.default,
        fontStyle: 'italic',
    },
});

