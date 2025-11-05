import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Card, Button, Input, Alert as AlertComponent, AlertModal } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';
import { useAlertModal } from '../../hooks';

type ActionType = 'split' | 'symbol';

/**
 * Corporate Actions Screen
 * Execute stock splits and symbol changes
 */
export default function CorporateActions() {
    const [tokenMint, setTokenMint] = useState('');
    const [actionType, setActionType] = useState<ActionType>('split');

    // Stock Split State
    const [splitRatio, setSplitRatio] = useState('7');
    const [splitNewSymbol, setSplitNewSymbol] = useState('');
    const [splitNewName, setSplitNewName] = useState('');
    const [splitLoading, setSplitLoading] = useState(false);

    // Symbol Change State
    const [newSymbol, setNewSymbol] = useState('');
    const [newName, setNewName] = useState('');
    const [symbolLoading, setSymbolLoading] = useState(false);

    const { alertState, hideAlert, error, success, confirm } = useAlertModal();

    const executeStockSplit = async () => {
        if (!tokenMint || !splitRatio || !splitNewSymbol || !splitNewName) {
            error('Error', 'All fields are required for stock split');
            return;
        }

        const ratio = parseInt(splitRatio, 10);
        if (isNaN(ratio) || ratio <= 0) {
            error('Error', 'Split ratio must be a positive number');
            return;
        }

        confirm(
            'Confirm Stock Split',
            `This will create a new token and migrate all holders with a ${ratio}-for-1 split. This operation cannot be undone.`,
            async () => {
                setSplitLoading(true);
                try {
                    const result = await api.executeStockSplit({
                        token_mint: tokenMint,
                        split_ratio: ratio,
                        new_symbol: splitNewSymbol,
                        new_name: splitNewName,
                    });

                    if (result.success) {
                        success(
                            'Success',
                            `Stock split executed successfully!\n\nNew Mint: ${result.new_mint}\nSignature: ${result.signature}`
                        );
                        // Clear form
                        setSplitRatio('7');
                        setSplitNewSymbol('');
                        setSplitNewName('');
                    } else {
                        error('Error', result.error || 'Failed to execute stock split');
                    }
                } catch (err) {
                    error('Error', (err as Error).message);
                } finally {
                    setSplitLoading(false);
                }
            }
        );
    };

    const changeSymbol = async () => {
        if (!tokenMint || !newSymbol || !newName) {
            error('Error', 'All fields are required for symbol change');
            return;
        }

        confirm(
            'Confirm Symbol Change',
            `Change token symbol to ${newSymbol}?`,
            async () => {
                setSymbolLoading(true);
                try {
                    const result = await api.changeSymbol({
                        token_mint: tokenMint,
                        new_symbol: newSymbol,
                        new_name: newName,
                    });

                    if (result.success) {
                        success('Success', 'Symbol changed successfully');
                        // Clear form
                        setNewSymbol('');
                        setNewName('');
                    } else {
                        error('Error', result.error || 'Failed to change symbol');
                    }
                } catch (err) {
                    error('Error', (err as Error).message);
                } finally {
                    setSymbolLoading(false);
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
                    <Text style={styles.title}>Corporate Actions</Text>
                    <Text style={styles.description}>
                        Execute stock splits and symbol changes
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
                    <Text style={styles.sectionTitle}>Action Type</Text>
                    <View style={styles.tabContainer}>
                        <Button
                            title="Stock Split"
                            variant={actionType === 'split' ? 'primary' : 'secondary'}
                            onPress={() => setActionType('split')}
                            style={styles.tabButton}
                        />
                        <Button
                            title="Symbol Change"
                            variant={actionType === 'symbol' ? 'primary' : 'secondary'}
                            onPress={() => setActionType('symbol')}
                            style={styles.tabButton}
                        />
                    </View>
                </Card>

                {actionType === 'split' && (
                    <Card>
                        <Text style={styles.sectionTitle}>Stock Split Configuration</Text>
                        <AlertComponent
                            variant="warning"
                            message="This will create a new token and migrate all holders. Balances will be multiplied by the split ratio."
                        />

                        <Input
                            label="Split Ratio"
                            value={splitRatio}
                            onChangeText={setSplitRatio}
                            placeholder="e.g., 7 for 7-for-1 split"
                            keyboardType="numeric"
                        />

                        <Input
                            label="New Token Symbol"
                            value={splitNewSymbol}
                            onChangeText={setSplitNewSymbol}
                            placeholder="e.g., ACME"
                        />

                        <Input
                            label="New Token Name"
                            value={splitNewName}
                            onChangeText={setSplitNewName}
                            placeholder="e.g., ACME Security Token (Split)"
                        />

                        <Button
                            title={`Execute ${splitRatio}-for-1 Stock Split`}
                            variant="danger"
                            onPress={executeStockSplit}
                            loading={splitLoading}
                        />
                    </Card>
                )}

                {actionType === 'symbol' && (
                    <Card>
                        <Text style={styles.sectionTitle}>Symbol Change Configuration</Text>
                        <AlertComponent
                            variant="info"
                            message="This will update the token metadata. All balances remain unchanged."
                        />

                        <Input
                            label="New Symbol"
                            value={newSymbol}
                            onChangeText={setNewSymbol}
                            placeholder="e.g., ACMEX"
                        />

                        <Input
                            label="New Name"
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="e.g., ACMEX Security Token"
                        />

                        <Button
                            title="Update Token Metadata"
                            variant="primary"
                            onPress={changeSymbol}
                            loading={symbolLoading}
                        />
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
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    tabContainer: {
        flexDirection: 'row',
    },
    tabButton: {
        flex: 1,
        marginHorizontal: theme.spacing.xs,
    },
});

