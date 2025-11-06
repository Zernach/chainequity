import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button, Input, AlertModal, CustomList } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';
import { useAlertModal } from '../../hooks';

interface CapTableHolder {
    wallet_address: string;
    shares: number;
    percentage: string;
    is_approved: boolean;
}

interface CapTableData {
    token: {
        mint: string;
        symbol: string;
        name: string;
        total_supply: number;
    };
    holders: CapTableHolder[];
    summary: {
        total_holders: number;
        block_height: number;
        timestamp: string;
    };
}

/**
 * Cap Table Screen
 * View and export cap tables with historical snapshots
 */
export default function CapTableView() {
    const [tokenMint, setTokenMint] = useState('');
    const [blockHeight, setBlockHeight] = useState('');
    const [capTable, setCapTable] = useState<CapTableData | null>(null);
    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const { alertState, hideAlert, error, success } = useAlertModal();

    const loadCapTable = async () => {
        if (!tokenMint) {
            error('Error', 'Please enter a token mint address');
            return;
        }

        setLoading(true);
        try {
            const height = blockHeight ? parseInt(blockHeight, 10) : undefined;
            const result = await api.getCapTable(tokenMint, height);

            if (result.success) {
                setCapTable(result as any);
            } else {
                error('Error', 'Failed to load cap table');
            }
        } catch (err) {
            error('Error', (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const exportCapTable = async (format: 'csv' | 'json') => {
        if (!capTable) {
            error('Error', 'Load a cap table first');
            return;
        }

        setExportLoading(true);
        try {
            const result = await api.exportCapTable(tokenMint, format);

            if (result.success) {
                success(
                    'Success',
                    `Cap table exported as ${format.toUpperCase()}`
                );
                // In a real app, this would trigger a download
                console.log('Exported data:', result.data);
            } else {
                error('Error', 'Failed to export cap table');
            }
        } catch (err) {
            error('Error', (err as Error).message);
        } finally {
            setExportLoading(false);
        }
    };

    const renderHolder = ({ item }: { item: CapTableHolder }) => (
        <View style={styles.holderRow}>
            <View style={styles.holderInfo}>
                <Text style={styles.walletText}>
                    {item.wallet_address.slice(0, 8)}...{item.wallet_address.slice(-8)}
                </Text>
                <Text style={styles.percentageText}>{item.percentage}%</Text>
            </View>
            <View style={styles.holderStats}>
                <Text style={styles.sharesText}>
                    {(item.shares / Math.pow(10, 9)).toLocaleString()} tokens
                </Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.is_approved ? theme.colors.success.bg : theme.colors.error.bg }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.is_approved ? theme.colors.success.default : theme.colors.error.default }
                    ]}>
                        {item.is_approved ? 'Approved' : 'Not Approved'}
                    </Text>
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
                    <Text style={styles.title}>Cap Table</Text>
                    <Text style={styles.description}>
                        View token holder distribution and export cap tables
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
                    <Input
                        label="Block Height (optional)"
                        value={blockHeight}
                        onChangeText={setBlockHeight}
                        placeholder="Leave empty for current block"
                        keyboardType="numeric"
                    />
                    <Button
                        title="Load Cap Table"
                        onPress={loadCapTable}
                        loading={loading}
                    />
                </Card>

                {capTable && (
                    <>
                        <Card>
                            <Text style={styles.sectionTitle}>Summary</Text>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Token:</Text>
                                <Text style={styles.summaryValue}>
                                    {capTable.token.symbol} - {capTable.token.name}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Supply:</Text>
                                <Text style={styles.summaryValue}>
                                    {(capTable.token.total_supply / Math.pow(10, 9)).toLocaleString()}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Holders:</Text>
                                <Text style={styles.summaryValue}>
                                    {capTable.summary.total_holders}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Block Height:</Text>
                                <Text style={styles.summaryValue}>
                                    {capTable.summary.block_height}
                                </Text>
                            </View>
                        </Card>

                        <Card>
                            <Text style={styles.sectionTitle}>
                                Holders ({capTable.holders.length})
                            </Text>
                            {capTable.holders.length === 0 ? (
                                <Text style={styles.emptyText}>No holders found</Text>
                            ) : (
                                <CustomList
                                    flatListProps={{
                                        data: capTable.holders,
                                        renderItem: renderHolder,
                                        keyExtractor: (item) => item.wallet_address,
                                        scrollEnabled: false,
                                    }}
                                />
                            )}
                        </Card>

                        <Card>
                            <Text style={styles.sectionTitle}>Export Options</Text>
                            <View style={styles.exportButtons}>
                                <Button
                                    title="Export CSV"
                                    onPress={() => exportCapTable('csv')}
                                    loading={exportLoading}
                                    variant="secondary"
                                    style={styles.exportButton}
                                />
                                <Button
                                    title="Export JSON"
                                    onPress={() => exportCapTable('json')}
                                    loading={exportLoading}
                                    variant="secondary"
                                    style={styles.exportButton}
                                />
                            </View>
                        </Card>
                    </>
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
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    summaryLabel: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
    },
    summaryValue: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.primary,
        fontWeight: '600',
    },
    holderRow: {
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    holderInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xs,
    },
    walletText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.primary,
        fontFamily: 'monospace',
    },
    percentageText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.primary.default,
        fontWeight: '600',
    },
    holderStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sharesText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: 4,
    },
    statusText: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
    },
    exportButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    exportButton: {
        flex: 1,
        marginHorizontal: theme.spacing.xs,
    },
    emptyText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        paddingVertical: theme.spacing.xl,
    },
});

