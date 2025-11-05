import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Card, Button, Input, Badge, WalletAddress, AlertModal } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';
import { useAlertModal } from '../../hooks';
import type { Security } from '../../services/handlers/token.handler';

interface AllowlistEntry {
    wallet_address: string;
    status: string;
    approved_at?: string;
}

/**
 * Allowlist Management Screen
 * Approve/revoke wallet addresses for token transfers
 */
export default function AllowlistManagement() {
    const [securities, setSecurities] = useState<Security[]>([]);
    const [selectedSecurity, setSelectedSecurity] = useState<Security | null>(null);
    const [tokenMint, setTokenMint] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingList, setLoadingList] = useState(false);
    const [loadingSecurities, setLoadingSecurities] = useState(false);
    const { alertState, hideAlert, alert, success, error, warning, confirm } = useAlertModal();

    // Load available securities on mount
    useEffect(() => {
        const loadSecuritiesOnMount = async () => {
            setLoadingSecurities(true);
            try {
                const result = await api.getAllSecurities();
                if (result.success) {
                    setSecurities(result.securities || []);
                    if (result.securities.length === 0) {
                        warning(
                            'No Securities Found',
                            'You need to initialize a token first before managing allowlists.'
                        );
                    }
                }
            } catch (err) {
                error('Error', 'Failed to load securities: ' + (err as Error).message);
            } finally {
                setLoadingSecurities(false);
            }
        };
        loadSecuritiesOnMount();
    }, []);

    // Auto-load allowlist when security is selected
    useEffect(() => {
        const loadAllowlistForSecurity = async (mintAddress: string) => {
            setLoadingList(true);
            try {
                const result = await api.getAllowlist(mintAddress);
                if (result.success) {
                    setAllowlist(result.allowlist || []);
                }
            } catch (err) {
                const errorMessage = (err as Error).message;
                if (errorMessage.includes('Security not found')) {
                    error(
                        'Security Not Found',
                        'The selected token has not been initialized. Please initialize it first from the Token Management screen.'
                    );
                } else {
                    error('Error', errorMessage);
                }
            } finally {
                setLoadingList(false);
            }
        };

        if (selectedSecurity) {
            setTokenMint(selectedSecurity.mint_address);
            loadAllowlistForSecurity(selectedSecurity.mint_address);
        } else {
            setTokenMint('');
            setAllowlist([]);
        }
    }, [selectedSecurity]);

    const loadSecurities = async () => {
        setLoadingSecurities(true);
        try {
            const result = await api.getAllSecurities();
            if (result.success) {
                setSecurities(result.securities || []);
                if (result.securities.length === 0) {
                    warning(
                        'No Securities Found',
                        'You need to initialize a token first before managing allowlists.'
                    );
                }
            }
        } catch (err) {
            error('Error', 'Failed to load securities: ' + (err as Error).message);
        } finally {
            setLoadingSecurities(false);
        }
    };

    const loadAllowlist = async () => {
        if (!tokenMint) {
            error('Error', 'Please select a security first');
            return;
        }

        setLoadingList(true);
        try {
            const result = await api.getAllowlist(tokenMint);
            if (result.success) {
                setAllowlist(result.allowlist || []);
            } else {
                error('Error', 'Failed to load allowlist');
            }
        } catch (err) {
            const errorMessage = (err as Error).message;
            if (errorMessage.includes('Security not found')) {
                error(
                    'Security Not Found',
                    'The selected token has not been initialized. Please initialize it first from the Token Management screen.'
                );
            } else {
                error('Error', errorMessage);
            }
        } finally {
            setLoadingList(false);
        }
    };

    const approveWallet = async () => {
        if (!tokenMint || !walletAddress) {
            error('Error', 'Please select a security and enter a wallet address');
            return;
        }

        setLoading(true);
        try {
            const result = await api.approveWallet({ token_mint: tokenMint, wallet_address: walletAddress });
            if (result.success) {
                success('Success', 'Wallet approved successfully');
                setWalletAddress('');
                // Reload allowlist to show new entry
                await loadAllowlist();
            } else {
                error('Error', 'Failed to approve wallet');
            }
        } catch (err) {
            const errorMessage = (err as Error).message;
            if (errorMessage.includes('Security not found')) {
                error(
                    'Security Not Found',
                    'The selected token has not been initialized. Please initialize it first from the Token Management screen.'
                );
            } else {
                error('Error', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const revokeWallet = async (wallet: string) => {
        confirm(
            'Confirm Revocation',
            `Are you sure you want to revoke ${wallet.slice(0, 8)}...?`,
            async () => {
                try {
                    const result = await api.revokeWallet(tokenMint, wallet);
                    if (result.success) {
                        success('Success', 'Wallet revoked');
                        loadAllowlist();
                    } else {
                        error('Error', 'Failed to revoke wallet');
                    }
                } catch (err) {
                    error('Error', (err as Error).message);
                }
            }
        );
    };

    const renderAllowlistEntry = ({ item }: { item: AllowlistEntry }) => (
        <View style={styles.entryRow}>
            <View style={styles.entryInfo}>
                <WalletAddress address={item.wallet_address} />
                <Badge variant={item.status === 'approved' ? 'success' : 'default'}>
                    {item.status}
                </Badge>
            </View>
            <Button
                title="Revoke"
                variant="danger"
                size="sm"
                onPress={() => revokeWallet(item.wallet_address)}
            />
        </View>
    );

    const renderSecurityItem = ({ item }: { item: Security }) => (
        <TouchableOpacity
            style={[
                styles.securityItem,
                selectedSecurity?.id === item.id && styles.securityItemSelected,
            ]}
            onPress={() => setSelectedSecurity(item)}
        >
            <View style={styles.securityInfo}>
                <Text style={styles.securitySymbol}>{item.symbol}</Text>
                <Text style={styles.securityName}>{item.name}</Text>
                <Text style={styles.securityMint} numberOfLines={1}>
                    {item.mint_address}
                </Text>
            </View>
            {selectedSecurity?.id === item.id && (
                <Badge variant="success">Selected</Badge>
            )}
        </TouchableOpacity>
    );

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
                    <Text style={styles.title}>Allowlist Management</Text>
                    <Text style={styles.description}>
                        Manage wallet approval for token transfers
                    </Text>
                </Card>

                <Card>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Select Security</Text>
                        <Button
                            title="Refresh"
                            variant="secondary"
                            size="sm"
                            onPress={loadSecurities}
                            loading={loadingSecurities}
                        />
                    </View>
                    {loadingSecurities ? (
                        <Text style={styles.loadingText}>Loading securities...</Text>
                    ) : securities.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <Text style={styles.emptyStateText}>
                                No securities found. Initialize a token first.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={securities}
                            renderItem={renderSecurityItem}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                        />
                    )}

                    {selectedSecurity && (
                        <View style={styles.selectedSecurityInfo}>
                            <Text style={styles.infoLabel}>Selected Token:</Text>
                            <Text style={styles.infoValue}>
                                {selectedSecurity.symbol} - {selectedSecurity.name}
                            </Text>
                            <Text style={styles.infoMintAddress}>{selectedSecurity.mint_address}</Text>
                        </View>
                    )}
                </Card>

                <Card>
                    <Text style={styles.sectionTitle}>Approve New Wallet</Text>
                    {!selectedSecurity ? (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>
                                ⚠️ Please select a security above first
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Input
                                label="Wallet Address to Approve"
                                value={walletAddress}
                                onChangeText={setWalletAddress}
                                placeholder="Enter wallet address"
                            />
                            <Button
                                title="Approve Wallet"
                                onPress={approveWallet}
                                loading={loading}
                                variant="success"
                            />
                        </>
                    )}
                </Card>

                {selectedSecurity && (
                    <Card>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                Current Allowlist ({allowlist.length})
                            </Text>
                            <Button
                                title="Refresh"
                                variant="secondary"
                                size="sm"
                                onPress={loadAllowlist}
                                loading={loadingList}
                            />
                        </View>
                        {loadingList ? (
                            <Text style={styles.loadingText}>Loading allowlist...</Text>
                        ) : allowlist.length === 0 ? (
                            <Text style={styles.emptyText}>
                                No wallets on allowlist yet. Approve wallets above to get started.
                            </Text>
                        ) : (
                            <FlatList
                                data={allowlist}
                                renderItem={renderAllowlistEntry}
                                keyExtractor={(item) => item.wallet_address}
                                scrollEnabled={false}
                            />
                        )}
                    </Card>
                )}
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
    },
    securityItem: {
        padding: theme.spacing.md,
        borderWidth: 2,
        borderColor: theme.colors.border.default,
        borderRadius: 8,
        marginBottom: theme.spacing.sm,
        backgroundColor: theme.colors.background.secondary,
    },
    securityItemSelected: {
        borderColor: theme.colors.primary.default,
        backgroundColor: theme.colors.primary.light,
    },
    securityInfo: {
        flex: 1,
    },
    securitySymbol: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
    },
    securityName: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    securityMint: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.tertiary,
        marginTop: 4,
        fontFamily: 'monospace',
    },
    selectedSecurityInfo: {
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background.tertiary,
        borderRadius: 8,
    },
    infoLabel: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.secondary,
    },
    infoValue: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.primary,
        marginTop: 4,
    },
    infoMintAddress: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.tertiary,
        marginTop: 4,
        fontFamily: 'monospace',
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
    emptyStateContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        textAlign: 'center',
    },
    loadingText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        paddingVertical: theme.spacing.md,
    },
    entryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    entryInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        paddingVertical: theme.spacing.xl,
    },
});

