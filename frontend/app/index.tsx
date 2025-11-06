import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';

// Components
import {
    Card,
    Badge,
    Button,
    CustomList,
} from '../components';

// Hooks
import { useAuth, useTokenHoldings, useAllTokenHoldings } from '../hooks';

export default function HomeScreen() {
    const router = useRouter();

    // Auth state
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    // Custom hooks for state management
    const { holdings, loading: holdingsLoading, refetch: refetchHoldings } = useTokenHoldings(user?.wallet_address || null);
    const { holdings: allHoldings, loading: allHoldingsLoading, refetch: refetchAllHoldings } = useAllTokenHoldings(user?.role === 'admin');

    // Redirect to auth if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/auth');
        }
    }, [authLoading, isAuthenticated, router]);

    // Show loading while checking auth
    if (authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.default} />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    // Don't render if not authenticated (will redirect)
    if (!isAuthenticated || !user) {
        return null;
    }

    return (
        <CustomList scrollViewProps={{ style: styles.container }}>
            {/* User Profile Card */}
            <Card style={styles.profileCard}>
                <View style={styles.profileHeader}>
                    <View>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={styles.userName}>{user.name}</Text>
                    </View>
                    <Badge variant={user.role === 'admin' ? 'success' : 'default'}>
                        {user.role}
                    </Badge>
                </View>

                {/* Admin Dashboard Button */}
                {user.role === 'admin' && (
                    <Button
                        title="🔐 Admin Dashboard"
                        onPress={() => router.push('/admin' as any)}
                        variant="primary"
                        style={styles.adminButton}
                    />
                )}
            </Card>

            {/* Token Holdings Card */}
            <Card>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Token Holdings</Text>
                    <TouchableOpacity onPress={refetchHoldings} disabled={holdingsLoading}>
                        <Text style={styles.refreshText}>
                            {holdingsLoading ? '⟳' : '↻'} Refresh
                        </Text>
                    </TouchableOpacity>
                </View>

                {!user?.wallet_address ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            Link a wallet to view your token holdings
                        </Text>
                        <Button
                            title="Link Wallet"
                            onPress={() => router.push('/link-wallet')}
                            variant="primary"
                            style={styles.linkWalletButton}
                        />
                    </View>
                ) : holdings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            {holdingsLoading ? 'Loading holdings...' : 'No token holdings yet'}
                        </Text>
                        {user.role === 'admin' && !holdingsLoading && (
                            <Text style={styles.emptyStateHint}>
                                Initialize a token and mint some tokens to see holdings here
                            </Text>
                        )}
                    </View>
                ) : (
                    <View style={styles.holdingsList}>
                        {holdings.map((holding, index) => (
                            <View key={holding.mint} style={styles.holdingItem}>
                                <View style={styles.holdingInfo}>
                                    <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                                    <Text style={styles.holdingName}>{holding.name}</Text>
                                </View>
                                <View style={styles.holdingStats}>
                                    <Text style={styles.holdingBalance}>
                                        {parseFloat(holding.balance).toLocaleString()} {holding.symbol}
                                    </Text>
                                    {holding.percentage !== undefined && (
                                        <Text style={styles.holdingPercentage}>
                                            {holding.percentage.toFixed(2)}% ownership
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </Card>

            {/* All Token Holdings Card (Admin Only) */}
            {user.role === 'admin' && (
                <Card>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>All Token Holdings</Text>
                        <TouchableOpacity onPress={refetchAllHoldings} disabled={allHoldingsLoading}>
                            <Text style={styles.refreshText}>
                                {allHoldingsLoading ? '⟳' : '↻'} Refresh
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {allHoldings.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>
                                {allHoldingsLoading ? 'Loading all holdings...' : 'No tokens have been minted yet'}
                            </Text>
                            {!allHoldingsLoading && (
                                <Text style={styles.emptyStateHint}>
                                    Initialize a token and mint some tokens to see holdings here
                                </Text>
                            )}
                        </View>
                    ) : (
                        <View style={styles.allHoldingsList}>
                            {allHoldings.map((tokenHolding) => (
                                <View key={tokenHolding.mint} style={styles.tokenSection}>
                                    {/* Token Header */}
                                    <View style={styles.tokenHeader}>
                                        <View style={styles.tokenHeaderInfo}>
                                            <Text style={styles.tokenSymbol}>{tokenHolding.symbol}</Text>
                                            <Text style={styles.tokenName}>{tokenHolding.name}</Text>
                                        </View>
                                        <View style={styles.tokenSupplyInfo}>
                                            <Text style={styles.tokenSupplyLabel}>Total Supply</Text>
                                            <Text style={styles.tokenSupplyValue}>
                                                {tokenHolding.totalSupply.toLocaleString()} {tokenHolding.symbol}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Holders List */}
                                    <View style={styles.holdersList}>
                                        <Text style={styles.holdersListTitle}>
                                            Holders ({tokenHolding.holders.length})
                                        </Text>
                                        {tokenHolding.holders.map((holder) => (
                                            <View key={holder.walletAddress} style={styles.holderItem}>
                                                <View style={styles.holderInfo}>
                                                    <Text style={styles.holderWallet} numberOfLines={1} ellipsizeMode="middle">
                                                        {holder.walletAddress.substring(0, 8)}...{holder.walletAddress.substring(holder.walletAddress.length - 6)}
                                                    </Text>
                                                    <Text style={styles.holderBalance}>
                                                        {holder.balance.toLocaleString()} {tokenHolding.symbol}
                                                    </Text>
                                                </View>
                                                <View style={styles.holderPercentageContainer}>
                                                    <Text style={styles.holderPercentage}>
                                                        {holder.percentage.toFixed(2)}%
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </Card>
            )}

        </CustomList>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.primary,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text.secondary,
    },
    profileCard: {
        marginBottom: theme.spacing.lg,
    },
    profileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    adminButton: {
        marginBottom: theme.spacing.md,
    },
    welcomeText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginTop: theme.spacing.xs,
    },
    profileInfo: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.default,
        paddingTop: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
    },
    infoLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: theme.colors.text.primary,
        fontFamily: 'monospace',
    },
    walletInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verifiedBadge: {
        marginLeft: theme.spacing.sm,
    },
    linkText: {
        fontSize: 14,
        color: theme.colors.primary.default,
        textDecorationLine: 'underline',
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
    refreshText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.primary.default,
        fontWeight: theme.typography.fontWeight.medium,
    },
    emptyState: {
        paddingVertical: theme.spacing.xl,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    emptyStateHint: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.tertiary,
        textAlign: 'center',
        marginTop: theme.spacing.xs,
    },
    linkWalletButton: {
        marginTop: theme.spacing.sm,
    },
    holdingsList: {
        gap: theme.spacing.md,
    },
    holdingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    holdingInfo: {
        flex: 1,
    },
    holdingSymbol: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    holdingName: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
    },
    holdingStats: {
        alignItems: 'flex-end',
    },
    holdingBalance: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    holdingPercentage: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.success.default,
        fontWeight: theme.typography.fontWeight.medium,
    },
    allHoldingsList: {
        gap: theme.spacing.xl,
    },
    tokenSection: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 12,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    tokenHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    tokenHeaderInfo: {
        flex: 1,
    },
    tokenSymbol: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    tokenName: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
    },
    tokenSupplyInfo: {
        alignItems: 'flex-end',
    },
    tokenSupplyLabel: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.tertiary,
        marginBottom: theme.spacing.xs,
    },
    tokenSupplyValue: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
    },
    holdersList: {
        gap: theme.spacing.sm,
    },
    holdersListTitle: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
    },
    holderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        backgroundColor: theme.colors.background.primary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    holderInfo: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    holderWallet: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.text.primary,
        fontFamily: 'monospace',
        marginBottom: theme.spacing.xs,
    },
    holderBalance: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.secondary,
    },
    holderPercentageContainer: {
        backgroundColor: theme.colors.success.bg,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.colors.success.dark,
    },
    holderPercentage: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.success.default,
    },
});
