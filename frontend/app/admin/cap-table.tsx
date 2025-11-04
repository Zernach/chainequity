import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, FlatList } from 'react-native';
import { Card, Button, Input } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';

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

    const loadCapTable = async () => {
        if (!tokenMint) {
            Alert.alert('Error', 'Please enter a token mint address');
            return;
        }

        setLoading(true);
        try {
            const height = blockHeight ? parseInt(blockHeight, 10) : undefined;
            const result = await api.getCapTable(tokenMint, height);

            if (result.success) {
                setCapTable(result.data);
            } else {
                Alert.alert('Error', 'Failed to load cap table');
            }
        } catch (error) {
            Alert.alert('Error', (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const exportCapTable = async (format: 'csv' | 'json') => {
        if (!capTable) {
            Alert.alert('Error', 'Load a cap table first');
            return;
        }

        setExportLoading(true);
        try {
            const result = await api.exportCapTable(tokenMint, format, blockHeight ? parseInt(blockHeight, 10) : undefined);

            if (result.success) {
                Alert.alert(
                    'Success',
                    `Cap table exported as ${format.toUpperCase()}`,
                    [{ text: 'OK' }]
                );
                // In a real app, this would trigger a download
                console.log('Exported data:', result.data);
            } else {
                Alert.alert('Error', 'Failed to export cap table');
            }
        } catch (error) {
            Alert.alert('Error', (error as Error).message);
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
                    { backgroundColor: item.is_approved ? theme.colors.success + '20' : theme.colors.danger + '20' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.is_approved ? theme.colors.success : theme.colors.danger }
                    ]}>
                        {item.is_approved ? 'Approved' : 'Not Approved'}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
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
                <Button onPress={loadCapTable} loading={loading}>
                    Load Cap Table
                </Button>
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
                            <FlatList
                                data={capTable.holders}
                                renderItem={renderHolder}
                                keyExtractor={(item) => item.wallet_address}
                                scrollEnabled={false}
                            />
                        )}
                    </Card>

                    <Card>
                        <Text style={styles.sectionTitle}>Export Options</Text>
                        <View style={styles.exportButtons}>
                            <Button
                                onPress={() => exportCapTable('csv')}
                                loading={exportLoading}
                                variant="secondary"
                                style={styles.exportButton}
                            >
                                Export CSV
                            </Button>
                            <Button
                                onPress={() => exportCapTable('json')}
                                loading={exportLoading}
                                variant="secondary"
                                style={styles.exportButton}
                            >
                                Export JSON
                            </Button>
                        </View>
                    </Card>
                </>
            )}
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
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    summaryLabel: {
        ...theme.typography.body,
        color: theme.colors.text.secondary,
    },
    summaryValue: {
        ...theme.typography.body,
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
        ...theme.typography.body,
        color: theme.colors.text.primary,
        fontFamily: 'monospace',
    },
    percentageText: {
        ...theme.typography.body,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    holderStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sharesText: {
        ...theme.typography.small,
        color: theme.colors.text.secondary,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: 4,
    },
    statusText: {
        ...theme.typography.small,
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
        ...theme.typography.body,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        paddingVertical: theme.spacing.xl,
    },
});

