import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Input, Badge, WalletAddress, AlertModal, SecuritySelector, CustomList } from '../../components';
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
    const [selectedSecurity, setSelectedSecurity] = useState<Security | null>(null);
    const [tokenMint, setTokenMint] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingList, setLoadingList] = useState(false);
    const { alertState, hideAlert, alert, success, error, warning, confirm } = useAlertModal();

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

    const handleSecuritySelected = (security: Security | null) => {
        setSelectedSecurity(security);
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
                    <Text style={styles.title}>Allowlist Management</Text>
                    <Text style={styles.description}>
                        Manage wallet approval for token transfers
                    </Text>
                </Card>

                <SecuritySelector
                    onSecuritySelected={handleSecuritySelected}
                    selectedSecurity={selectedSecurity}
                    emptyMessage="No securities found. Initialize a token first before managing allowlists."
                    onError={error}
                    onWarning={warning}
                />

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
                            <CustomList
                                flatListProps={{
                                    data: allowlist,
                                    renderItem: renderAllowlistEntry,
                                    keyExtractor: (item) => item.wallet_address,
                                    scrollEnabled: false,
                                }}
                            />
                        )}
                    </Card>
                )}
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

