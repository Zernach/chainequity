import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Card, Button, Input, Badge, AlertModal } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';
import { useAlertModal } from '../../hooks';

interface TokenTransfer {
    signature: string;
    from_wallet: string;
    to_wallet: string;
    amount: number;
    block_height: number;
    timestamp: string;
    status: string;
}

/**
 * Transaction History Screen
 * View token transfer history
 */
export default function TransactionHistory() {
    const [tokenMint, setTokenMint] = useState('');
    const [transfers, setTransfers] = useState<TokenTransfer[]>([]);
    const [loading, setLoading] = useState(false);
    const { alertState, hideAlert, error } = useAlertModal();

    const loadTransfers = async () => {
        if (!tokenMint) {
            error('Error', 'Please enter a token mint address');
            return;
        }

        setLoading(true);
        try {
            const result = await api.getTransferHistory(tokenMint);
            if (result.success) {
                setTransfers((result.transfers as unknown as TokenTransfer[]) || []);
            } else {
                error('Error', 'Failed to load transfer history');
            }
        } catch (err) {
            error('Error', (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (amount: number) => {
        return (amount / Math.pow(10, 9)).toLocaleString();
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
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
                    {item.signature.slice(0, 8)}...{item.signature.slice(-8)}
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
                    <Text style={styles.detailValue}>{formatDate(item.timestamp)}</Text>
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
            <ScrollView style={styles.container}>
                <Card>
                    <Text style={styles.title}>Transaction History</Text>
                    <Text style={styles.description}>
                        View all token transfers on the blockchain
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
                    <Button
                        title="Load Transfers"
                        onPress={loadTransfers}
                        loading={loading}
                    />
                </Card>

                <Card>
                    <Text style={styles.sectionTitle}>
                        Transfer History ({transfers.length})
                    </Text>
                    {transfers.length === 0 ? (
                        <Text style={styles.emptyText}>
                            No transfers found. Load a token mint to view transaction history.
                        </Text>
                    ) : (
                        <FlatList
                            data={transfers}
                            renderItem={renderTransfer}
                            keyExtractor={(item) => item.signature}
                            scrollEnabled={false}
                        />
                    )}
                </Card>

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

