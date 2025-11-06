import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Badge, AlertModal, CustomList } from '../../components';
import SecuritySelector from '../../components/SecuritySelector';
import { theme } from '../../constants';
import { api } from '../../services/api';
import { useAlertModal } from '../../hooks';
import type { Security } from '../../services/handlers/token.handler';

interface TokenTransfer {
    transaction_signature: string;
    from_wallet: string;
    to_wallet: string;
    amount: number;
    block_height: number;
    block_time: string;
    status: string;
}

/**
 * Transaction History Screen
 * View token transfer history
 */
export default function TransactionHistory() {
    const [selectedSecurity, setSelectedSecurity] = useState<Security | null>(null);
    const [transfers, setTransfers] = useState<TokenTransfer[]>([]);
    const [loading, setLoading] = useState(false);
    const { alertState, hideAlert, error, warning } = useAlertModal();

    const loadTransfers = async () => {
        if (!selectedSecurity) {
            error('Error', 'Please select a security first');
            return;
        }

        setLoading(true);
        try {
            console.log('[Transfers] Loading transfer history for:', selectedSecurity.mint_address);
            const result = await api.getTransferHistory(selectedSecurity.mint_address);
            console.log('[Transfers] API response:', result);

            if (result.success && result.data) {
                console.log('[Transfers] Transfer data:', result.data);
                console.log('[Transfers] Transfer count:', result.data.transfers?.length || 0);
                setTransfers((result.data.transfers as unknown as TokenTransfer[]) || []);
            } else {
                error('Error', result.error || 'Failed to load transfer history');
            }
        } catch (err) {
            console.error('[Transfers] Error loading transfers:', err);
            error('Error', (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (amount: number) => {
        return (amount / Math.pow(10, 9)).toLocaleString();
    };

    const formatDate = (blockTime: string) => {
        const date = new Date(blockTime);
        return date.toLocaleString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'success';
            case 'pending':
                return 'default';
            case 'failed':
                return 'error';
            default:
                return 'default';
        }
    };

    const renderTransfer = ({ item }: { item: TokenTransfer }) => (
        <View style={styles.transferRow}>
            <View style={styles.transferHeader}>
                <Text style={styles.signatureText}>
                    {item.transaction_signature.slice(0, 8)}...{item.transaction_signature.slice(-8)}
                </Text>
                <Badge variant={getStatusColor(item.status) as any}>
                    {item.status}
                </Badge>
            </View>

            <View style={styles.transferDetails}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From:</Text>
                    <Text style={styles.detailValue}>
                        {item.from_wallet.slice(0, 8)}...{item.from_wallet.slice(-8)}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To:</Text>
                    <Text style={styles.detailValue}>
                        {item.to_wallet.slice(0, 8)}...{item.to_wallet.slice(-8)}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount:</Text>
                    <Text style={styles.detailValue}>{formatAmount(item.amount)} tokens</Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Block:</Text>
                    <Text style={styles.detailValue}>{item.block_height}</Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time:</Text>
                    <Text style={styles.detailValue}>{formatDate(item.block_time)}</Text>
                </View>
            </View>
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
                    <Text style={styles.title}>Transaction History</Text>
                    <Text style={styles.description}>
                        View all token transfers on the blockchain
                    </Text>
                </Card>

                <SecuritySelector
                    onSecuritySelected={setSelectedSecurity}
                    selectedSecurity={selectedSecurity}
                    onError={error}
                    onWarning={warning}
                />

                <Card>
                    <Button
                        title="Load Transfers"
                        onPress={loadTransfers}
                        loading={loading}
                        disabled={!selectedSecurity}
                    />
                </Card>

                {selectedSecurity && (
                    <Card>
                        <Text style={styles.sectionTitle}>
                            Transfer History ({transfers.length})
                        </Text>
                        {transfers.length === 0 ? (
                            <View>
                                <Text style={styles.emptyText}>
                                    No transfers recorded yet for this token.
                                </Text>
                                <View style={styles.infoBox}>
                                    <Text style={styles.infoText}>
                                        💡 Transfer records are created when tokens are moved between wallets using the gated token program's transfer instruction. Direct minting doesn't create transfer records.
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <CustomList
                                flatListProps={{
                                    data: transfers,
                                    renderItem: renderTransfer,
                                    keyExtractor: (item) => item.transaction_signature,
                                    scrollEnabled: false,
                                }}
                            />
                        )}
                    </Card>
                )}

                <Card>
                    <Text style={styles.sectionTitle}>About Transaction History</Text>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            💡 This shows all gated transfers for the selected token. Only transfers between approved wallets will succeed.
                        </Text>
                    </View>
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepText}>
                            • <Text style={styles.bold}>Confirmed</Text>: Transfer completed successfully
                        </Text>
                        <Text style={styles.stepText}>
                            • <Text style={styles.bold}>Pending</Text>: Transfer submitted, awaiting confirmation
                        </Text>
                        <Text style={styles.stepText}>
                            • <Text style={styles.bold}>Failed</Text>: Transfer rejected (likely allowlist violation)
                        </Text>
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
    transferRow: {
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    transferHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    signatureText: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
        fontFamily: 'monospace',
    },
    transferDetails: {
        marginLeft: theme.spacing.sm,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.xs,
    },
    detailLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        fontWeight: theme.typography.fontWeight.medium,
    },
    detailValue: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.primary,
        fontFamily: 'monospace',
    },
    emptyText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        paddingVertical: theme.spacing.xl,
    },
    infoBox: {
        backgroundColor: theme.colors.info.bg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.info.default,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderRadius: 4,
    },
    infoText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.info.default,
    },
    stepContainer: {
        marginTop: theme.spacing.sm,
    },
    stepText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.sm,
    },
    bold: {
        fontWeight: theme.typography.fontWeight.semibold,
    },
});

