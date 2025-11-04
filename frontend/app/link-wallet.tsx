/**
 * Link Wallet Screen
 * Allows authenticated users to link their Solana wallet to their account
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useWalletConnection, formatWalletAddress } from '../hooks/useWalletConnection';
import { requestNonce, generateSignatureMessage } from '../services/auth';
import { Button, LoadingSpinner, Card, Badge, Input } from '../components';
import { theme } from '../constants';

export default function LinkWalletScreen() {
    const router = useRouter();
    const { user, linkWallet, loading: authLoading } = useAuth();
    const {
        connected: walletConnected,
        walletAddress,
        walletType,
        connect: connectWallet,
        connectWithAddress: connectWithCustomAddress,
        disconnect: disconnectWallet,
        signMessage,
        connecting: walletConnecting,
        error: walletError,
    } = useWalletConnection();

    const [linking, setLinking] = useState(false);
    const [customAddress, setCustomAddress] = useState('');
    const [nonceInfo, setNonceInfo] = useState<{ nonce: string; expiresIn: number } | null>(null);

    const loading = authLoading || walletConnecting || linking;
    const hasWallet = user?.wallet_address && user.wallet_verified;
    const isMockWallet = walletType === 'mock';

    // Handle wallet linking with nonce
    const handleLinkWallet = async () => {
        if (!walletConnected || !walletAddress) {
            Alert.alert('Error', 'Please connect your wallet first');
            return;
        }

        try {
            setLinking(true);

            // Request nonce from backend
            console.log('[LinkWallet] Requesting nonce for wallet:', walletAddress);
            const { nonce, expiresIn } = await requestNonce(walletAddress);
            setNonceInfo({ nonce, expiresIn });

            console.log('[LinkWallet] Nonce received:', nonce.substring(0, 8) + '...');

            // Generate message with nonce and timestamp
            const timestamp = Date.now();
            const message = generateSignatureMessage(nonce, timestamp);

            console.log('[LinkWallet] Requesting signature...');
            // Sign message with wallet
            const signature = await signMessage(message);

            console.log('[LinkWallet] Signature received, linking wallet...');
            // Link wallet to account
            await linkWallet({
                wallet_address: walletAddress,
                signature,
                message,
            });

            setNonceInfo(null);

            console.log('[LinkWallet] Wallet linked successfully!');
            console.log('[LinkWallet] Updated user:', user);

            Alert.alert(
                'Success',
                'Your wallet has been linked successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            setNonceInfo(null);
            console.error('[LinkWallet] Error:', error);
            Alert.alert(
                'Link Wallet Error',
                error instanceof Error ? error.message : 'Failed to link wallet'
            );
        } finally {
            setLinking(false);
        }
    };

    // Handle custom address connection (mock wallet only)
    const handleConnectWithAddress = async () => {
        if (!customAddress.trim()) {
            Alert.alert('Error', 'Please enter a wallet address');
            return;
        }

        if (!connectWithCustomAddress) {
            Alert.alert('Error', 'Custom address connection is only available in development mode');
            return;
        }

        try {
            await connectWithCustomAddress(customAddress.trim());
        } catch (error) {
            Alert.alert(
                'Connection Error',
                error instanceof Error ? error.message : 'Failed to connect wallet'
            );
        }
    };

    if (!user) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>
                    Please log in to link your wallet
                </Text>
                <Button
                    title="Go to Login"
                    onPress={() => router.replace('/auth')}
                    style={styles.button}
                />
            </View>
        );
    }

    if (loading && !walletConnected) {
        return (
            <View style={styles.container}>
                <LoadingSpinner size="large" />
                <Text style={styles.loadingText}>
                    {walletConnecting ? 'Connecting wallet...' : 'Processing...'}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <Text style={styles.title}>Link Your Wallet</Text>
                <Text style={styles.subtitle}>
                    Connect your Solana wallet to enable token transactions
                </Text>
            </View>

            {/* Current User Info */}
            <Card style={styles.card}>
                <Text style={styles.cardTitle}>Account Information</Text>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Name:</Text>
                    <Text style={styles.value}>{user.name}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{user.email || 'N/A'}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Role:</Text>
                    <Badge
                        label={user.role}
                        variant={user.role === 'admin' ? 'success' : 'default'}
                    />
                </View>

                {hasWallet && (
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Current Wallet:</Text>
                        <View style={styles.walletBadge}>
                            <Text style={styles.walletText}>
                                {formatWalletAddress(user.wallet_address || '')}
                            </Text>
                            {user.wallet_verified && (
                                <Badge
                                    label="Verified"
                                    variant="success"
                                    style={styles.verifiedBadge}
                                />
                            )}
                        </View>
                    </View>
                )}
            </Card>

            {/* Wallet Connection */}
            {hasWallet ? (
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>Update Wallet</Text>
                    <Text style={styles.description}>
                        You already have a wallet linked to your account. You can update it by
                        connecting a new wallet and signing a verification message.
                    </Text>

                    {walletConnected && walletAddress && (
                        <View style={styles.connectedWallet}>
                            <Text style={styles.connectedLabel}>
                                New Wallet Connected:
                            </Text>
                            <Text style={styles.connectedAddress}>
                                {formatWalletAddress(walletAddress)}
                            </Text>
                        </View>
                    )}

                    {!walletConnected ? (
                        <Button
                            title="Connect New Wallet"
                            onPress={connectWallet}
                            loading={loading}
                            style={styles.button}
                        />
                    ) : (
                        <>
                            <Button
                                title="Update Wallet"
                                onPress={handleLinkWallet}
                                loading={loading}
                                style={styles.button}
                            />
                            <Button
                                title="Disconnect"
                                onPress={disconnectWallet}
                                variant="secondary"
                                style={styles.button}
                            />
                        </>
                    )}
                </Card>
            ) : (
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>Connect Your Wallet</Text>
                    <Text style={styles.description}>
                        Link your Solana wallet to your account to enable token transactions,
                        transfers, and other on-chain operations.
                    </Text>

                    <View style={styles.steps}>
                        <View style={styles.step}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <Text style={styles.stepText}>
                                Connect your Solana wallet (Phantom, Solflare, etc.)
                            </Text>
                        </View>

                        <View style={styles.step}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <Text style={styles.stepText}>
                                Sign a verification message to prove ownership
                            </Text>
                        </View>

                        <View style={styles.step}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>3</Text>
                            </View>
                            <Text style={styles.stepText}>
                                Your wallet will be securely linked to your account
                            </Text>
                        </View>
                    </View>

                    {walletConnected && walletAddress && (
                        <View style={styles.connectedWallet}>
                            <Text style={styles.connectedLabel}>Wallet Connected:</Text>
                            <Text style={styles.connectedAddress}>
                                {formatWalletAddress(walletAddress)}
                            </Text>
                        </View>
                    )}

                    {/* Show wallet type indicator */}
                    {walletType && (
                        <View style={styles.walletTypeIndicator}>
                            <Text style={styles.walletTypeText}>
                                Mode: {walletType === 'mock' ? 'Development (Mock)' : walletType === 'web' ? 'Web Wallet' : 'WalletConnect'}
                            </Text>
                        </View>
                    )}

                    {/* Mock wallet custom address input */}
                    {isMockWallet && !walletConnected && (
                        <View style={styles.customAddressSection}>
                            <Text style={styles.customAddressLabel}>
                                Enter Custom Wallet Address (Dev Mode):
                            </Text>
                            <Input
                                value={customAddress}
                                onChangeText={setCustomAddress}
                                placeholder="Enter Solana wallet address"
                                style={styles.customAddressInput}
                            />
                            <Button
                                title="Connect with Custom Address"
                                onPress={handleConnectWithAddress}
                                loading={loading}
                                style={styles.button}
                                variant="secondary"
                            />
                            <Text style={styles.orText}>OR</Text>
                        </View>
                    )}

                    {/* Nonce info (while linking) */}
                    {nonceInfo && (
                        <View style={styles.nonceInfo}>
                            <Text style={styles.nonceLabel}>Security Check Active</Text>
                            <Text style={styles.nonceExpiry}>
                                Expires in: {nonceInfo.expiresIn}s
                            </Text>
                        </View>
                    )}

                    {/* Wallet error display */}
                    {walletError && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorBannerText}>{walletError.message}</Text>
                        </View>
                    )}

                    {!walletConnected ? (
                        <Button
                            title={isMockWallet ? 'Connect Mock Wallet' : 'Connect Wallet'}
                            onPress={connectWallet}
                            loading={loading}
                            style={styles.button}
                        />
                    ) : (
                        <>
                            <Button
                                title="Link Wallet to Account"
                                onPress={handleLinkWallet}
                                loading={loading}
                                style={styles.button}
                            />
                            <Button
                                title="Disconnect"
                                onPress={disconnectWallet}
                                variant="secondary"
                                style={styles.button}
                            />
                        </>
                    )}
                </Card>
            )}

            <Button
                title="Back to Home"
                onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
                variant="secondary"
                style={styles.button}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    scrollContent: {
        flexGrow: 1,
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background.primary,
    },
    header: {
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.text.secondary,
    },
    card: {
        marginBottom: theme.spacing.lg,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    description: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.md,
        lineHeight: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    label: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        fontWeight: '500',
    },
    value: {
        fontSize: 14,
        color: theme.colors.text.primary,
    },
    walletBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    walletText: {
        fontSize: 14,
        color: theme.colors.text.primary,
        fontFamily: 'monospace',
    },
    verifiedBadge: {
        marginLeft: theme.spacing.sm,
    },
    steps: {
        marginVertical: theme.spacing.md,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.primary.default,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    stepNumberText: {
        color: theme.colors.primary.contrast,
        fontSize: 14,
        fontWeight: 'bold',
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text.primary,
        lineHeight: 20,
    },
    connectedWallet: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    connectedLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
    },
    connectedAddress: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
        fontFamily: 'monospace',
    },
    button: {
        marginTop: theme.spacing.md,
    },
    errorText: {
        fontSize: 16,
        color: theme.colors.error.default,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text.secondary,
    },
    walletTypeIndicator: {
        backgroundColor: theme.colors.background.secondary,
        padding: theme.spacing.sm,
        borderRadius: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    walletTypeText: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        textAlign: 'center',
    },
    customAddressSection: {
        marginBottom: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.warning.default,
    },
    customAddressLabel: {
        fontSize: 14,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
        fontWeight: '500',
    },
    customAddressInput: {
        marginBottom: theme.spacing.sm,
    },
    orText: {
        textAlign: 'center',
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginTop: theme.spacing.sm,
        fontWeight: '600',
    },
    nonceInfo: {
        backgroundColor: theme.colors.primary.light,
        padding: theme.spacing.sm,
        borderRadius: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    nonceLabel: {
        fontSize: 12,
        color: theme.colors.primary.dark,
        fontWeight: '600',
    },
    nonceExpiry: {
        fontSize: 11,
        color: theme.colors.primary.dark,
        marginTop: theme.spacing.xs,
    },
    errorBanner: {
        backgroundColor: theme.colors.error.light,
        padding: theme.spacing.sm,
        borderRadius: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    errorBannerText: {
        fontSize: 13,
        color: theme.colors.error.dark,
        textAlign: 'center',
    },
});

