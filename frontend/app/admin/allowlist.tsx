import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, FlatList } from 'react-native';
import { Card, Button, Input, Badge, WalletAddress } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';

interface AllowlistEntry {
    wallet_address: string;
    status: string;
    approved_at: string | null;
}

/**
 * Allowlist Management Screen
 * Approve/revoke wallet addresses for token transfers
 */
export default function AllowlistManagement() {
    const [tokenMint, setTokenMint] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingList, setLoadingList] = useState(false);

    const loadAllowlist = async () => {
        if (!tokenMint) {
            Alert.alert('Error', 'Please enter a token mint address');
            return;
        }

        setLoadingList(true);
        try {
            const result = await api.getAllowlist(tokenMint);
            if (result.success) {
                setAllowlist(result.allowlist || []);
            } else {
                Alert.alert('Error', 'Failed to load allowlist');
            }
        } catch (error) {
            Alert.alert('Error', (error as Error).message);
        } finally {
            setLoadingList(false);
        }
    };

    const approveWallet = async () => {
        if (!tokenMint || !walletAddress) {
            Alert.alert('Error', 'Please enter both token mint and wallet address');
            return;
        }

        setLoading(true);
        try {
            const result = await api.approveWallet({ tokenMint, walletAddress });
            if (result.success) {
                Alert.alert('Success', 'Wallet approved successfully');
                setWalletAddress('');
                loadAllowlist();
            } else {
                Alert.alert('Error', 'Failed to approve wallet');
            }
        } catch (error) {
            Alert.alert('Error', (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const revokeWallet = async (wallet: string) => {
        Alert.alert(
            'Confirm Revocation',
            `Are you sure you want to revoke ${wallet.slice(0, 8)}...?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Revoke',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await api.revokeWallet(tokenMint, wallet);
                            if (result.success) {
                                Alert.alert('Success', 'Wallet revoked');
                                loadAllowlist();
                            } else {
                                Alert.alert('Error', 'Failed to revoke wallet');
                            }
                        } catch (error) {
                            Alert.alert('Error', (error as Error).message);
                        }
                    },
                },
            ]
        );
    };

    const renderAllowlistEntry = ({ item }: { item: AllowlistEntry }) => (
        <View style={styles.entryRow}>
            <View style={styles.entryInfo}>
                <WalletAddress address={item.wallet_address} />
                <Badge variant={item.status === 'approved' ? 'success' : 'danger'}>
                    {item.status}
                </Badge>
            </View>
            <Button
                variant="danger"
                size="small"
                onPress={() => revokeWallet(item.wallet_address)}
            >
                Revoke
            </Button>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            <Card>
                <Text style={styles.title}>Allowlist Management</Text>
                <Text style={styles.description}>
                    Manage wallet approval for token transfers
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
                <Button onPress={loadAllowlist} loading={loadingList}>
                    Load Allowlist
                </Button>
            </Card>

            <Card>
                <Text style={styles.sectionTitle}>Approve New Wallet</Text>
                <Input
                    label="Wallet Address to Approve"
                    value={walletAddress}
                    onChangeText={setWalletAddress}
                    placeholder="Enter wallet address"
                />
                <Button onPress={approveWallet} loading={loading} variant="success">
                    Approve Wallet
                </Button>
            </Card>

            <Card>
                <Text style={styles.sectionTitle}>
                    Current Allowlist ({allowlist.length})
                </Text>
                {allowlist.length === 0 ? (
                    <Text style={styles.emptyText}>
                        No wallets on allowlist. Load a token mint to view entries.
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
        ...theme.typography.body,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        paddingVertical: theme.spacing.xl,
    },
});

