import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Button, Input, Alert as AlertComponent } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';

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

    const executeStockSplit = async () => {
        if (!tokenMint || !splitRatio || !splitNewSymbol || !splitNewName) {
            Alert.alert('Error', 'All fields are required for stock split');
            return;
        }

        const ratio = parseInt(splitRatio, 10);
        if (isNaN(ratio) || ratio <= 0) {
            Alert.alert('Error', 'Split ratio must be a positive number');
            return;
        }

        Alert.alert(
            'Confirm Stock Split',
            `This will create a new token and migrate all holders with a ${ratio}-for-1 split. This operation cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Execute',
                    style: 'destructive',
                    onPress: async () => {
                        setSplitLoading(true);
                        try {
                            const result = await api.executeStockSplit({
                                tokenMint,
                                splitRatio: ratio,
                                newSymbol: splitNewSymbol,
                                newName: splitNewName,
                            });

                            if (result.success) {
                                Alert.alert(
                                    'Success',
                                    `Stock split executed successfully!\n\nNew Mint: ${result.newMint}\nHolders Migrated: ${result.holdersTransitioned}`,
                                    [{ text: 'OK' }]
                                );
                                // Clear form
                                setSplitRatio('7');
                                setSplitNewSymbol('');
                                setSplitNewName('');
                            } else {
                                Alert.alert('Error', result.error || 'Failed to execute stock split');
                            }
                        } catch (error) {
                            Alert.alert('Error', (error as Error).message);
                        } finally {
                            setSplitLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const changeSymbol = async () => {
        if (!tokenMint || !newSymbol || !newName) {
            Alert.alert('Error', 'All fields are required for symbol change');
            return;
        }

        Alert.alert(
            'Confirm Symbol Change',
            `Change token symbol to ${newSymbol}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Change',
                    onPress: async () => {
                        setSymbolLoading(true);
                        try {
                            const result = await api.changeSymbol({
                                tokenMint,
                                newSymbol,
                                newName,
                            });

                            if (result.success) {
                                Alert.alert('Success', 'Symbol changed successfully');
                                // Clear form
                                setNewSymbol('');
                                setNewName('');
                            } else {
                                Alert.alert('Error', result.error || 'Failed to change symbol');
                            }
                        } catch (error) {
                            Alert.alert('Error', (error as Error).message);
                        } finally {
                            setSymbolLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
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
                        variant={actionType === 'split' ? 'primary' : 'secondary'}
                        onPress={() => setActionType('split')}
                        style={styles.tabButton}
                    >
                        Stock Split
                    </Button>
                    <Button
                        variant={actionType === 'symbol' ? 'primary' : 'secondary'}
                        onPress={() => setActionType('symbol')}
                        style={styles.tabButton}
                    >
                        Symbol Change
                    </Button>
                </View>
            </Card>

            {actionType === 'split' && (
                <Card>
                    <Text style={styles.sectionTitle}>Stock Split Configuration</Text>
                    <AlertComponent variant="warning">
                        This will create a new token and migrate all holders. Balances
                        will be multiplied by the split ratio.
                    </AlertComponent>

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
                        variant="danger"
                        onPress={executeStockSplit}
                        loading={splitLoading}
                    >
                        Execute {splitRatio}-for-1 Stock Split
                    </Button>
                </Card>
            )}

            {actionType === 'symbol' && (
                <Card>
                    <Text style={styles.sectionTitle}>Symbol Change Configuration</Text>
                    <AlertComponent variant="info">
                        This will update the token metadata. All balances remain
                        unchanged.
                    </AlertComponent>

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
                        variant="primary"
                        onPress={changeSymbol}
                        loading={symbolLoading}
                    >
                        Update Token Metadata
                    </Button>
                </Card>
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
    tabContainer: {
        flexDirection: 'row',
    },
    tabButton: {
        flex: 1,
        marginHorizontal: theme.spacing.xs,
    },
});

