import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';

// Components
import {
    HelloWorld,
    WebSocketStatus,
    WebSocketMessages,
    UserManagement,
    UsersList,
    TokenMinting,
    Card,
    Badge,
    Button,
} from '../components';

// Hooks
import { useUsers, useWebSocketConnection, useTokenMint, useAuth } from '../hooks';
import { formatWalletAddress } from '../hooks/useWalletConnection';

export default function HomeScreen() {
    const router = useRouter();

    // Auth state
    const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();

    // Custom hooks for state management
    const { users, loading: usersLoading, createUser, fetchUsers } = useUsers();
    const { connected, messages, sendTestMessage } = useWebSocketConnection();
    const { loading: mintLoading, result: mintResult, mintToken } = useTokenMint();

    // Combined loading state
    const loading = usersLoading || mintLoading;

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

    const handleSignOut = async () => {
        await signOut();
        router.replace('/auth');
    };

    return (
        <ScrollView style={styles.container}>
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

                <View style={styles.profileInfo}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email:</Text>
                        <Text style={styles.infoValue}>{user.email || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Wallet:</Text>
                        {user.wallet_address ? (
                            <View style={styles.walletInfo}>
                                <Text style={styles.infoValue}>
                                    {formatWalletAddress(user.wallet_address)}
                                </Text>
                                {user.wallet_verified && (
                                    <Badge variant="success" style={styles.verifiedBadge}>
                                        ✓
                                    </Badge>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => router.push('/link-wallet')}>
                                <Text style={styles.linkText}>Link Wallet</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.profileActions}>
                    {user.wallet_address && (
                        <View style={{ marginRight: theme.spacing.sm, flex: 1 }}>
                            <Button
                                title="Manage Wallet"
                                onPress={() => router.push('/link-wallet')}
                                variant="secondary"
                                style={styles.actionButton}
                            />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Button
                            title="Sign Out"
                            onPress={handleSignOut}
                            variant="secondary"
                            style={styles.actionButton}
                        />
                    </View>
                </View>
            </Card>

            <HelloWorld />

            <WebSocketStatus connected={connected} onSendTestMessage={sendTestMessage} />

            <WebSocketMessages messages={messages} />

            <UserManagement onCreateUser={createUser} onFetchUsers={fetchUsers} loading={usersLoading} />

            <UsersList users={users} />

            <TokenMinting onMint={() => mintToken(1)} loading={mintLoading} result={mintResult} />

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary.default} />
                </View>
            )}
        </ScrollView>
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
    profileActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 16,
    },
    loadingOverlay: {
        padding: 20,
        alignItems: 'center',
    },
});
