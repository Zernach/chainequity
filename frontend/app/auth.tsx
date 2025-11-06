/**
 * Authentication Screen
 * Handles wallet-based authentication only
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useWalletConnection, formatWalletAddress } from '../hooks/useWalletConnection';
import { generateSignatureMessage, requestNonce } from '../services/auth';
import { Button, LoadingSpinner, Card, AlertModal, CustomList } from '../components';
import { theme } from '../constants';
import { useAlertModal } from '../hooks';

export default function AuthScreen() {
    const router = useRouter();
    const { walletLogin, loading: authLoading } = useAuth();
    const {
        connected: walletConnected,
        walletAddress,
        connect: connectWallet,
        signMessage,
        connecting: walletConnecting,
    } = useWalletConnection();
    const { alertState, hideAlert, error } = useAlertModal();

    const loading = authLoading || walletConnecting;

    // Handle wallet-based auth
    const handleWalletAuth = async () => {
        try {
            // Connect wallet if not connected
            if (!walletConnected) {
                await connectWallet();
                return;
            }

            if (!walletAddress) {
                throw new Error('Wallet address not available');
            }

            // Request nonce from backend
            console.log('[AuthScreen] Requesting nonce for wallet:', walletAddress);
            const { nonce } = await requestNonce(walletAddress);
            console.log('[AuthScreen] Received nonce:', nonce.substring(0, 8) + '...');

            // Generate message with nonce
            const message = generateSignatureMessage(nonce);
            console.log('[AuthScreen] Generated message with nonce');

            // Sign message
            const signature = await signMessage(message);
            console.log('[AuthScreen] Message signed successfully');

            // Authenticate with backend
            await walletLogin({
                wallet_address: walletAddress,
                signature,
                message,
            });

            // Navigate to home on success
            router.replace('/');
        } catch (err) {
            console.error('[AuthScreen] Wallet auth error:', err);
            error(
                'Wallet Authentication Error',
                err instanceof Error ? err.message : 'Wallet authentication failed'
            );
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <LoadingSpinner size="large" />
                <Text style={styles.loadingText}>
                    {authLoading ? 'Authenticating...' : 'Connecting wallet...'}
                </Text>
            </View>
        );
    }

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
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <CustomList
                    scrollViewProps={{
                        contentContainerStyle: styles.scrollContent,
                        keyboardShouldPersistTaps: "handled",
                    }}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>{'🔗 ChainEquity'}</Text>
                        <Text style={styles.subtitle}>
                            {'Capitalization Table Management on Solana Blockchain'}
                        </Text>
                    </View>

                    {/* Wallet Auth */}
                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>Wallet Authentication</Text>
                        <Text style={styles.walletDescription}>
                            Connect your Solana wallet to get started
                        </Text>

                        {walletConnected && walletAddress && (
                            <View style={styles.walletInfo}>
                                <Text style={styles.walletLabel}>Connected Wallet:</Text>
                                <Text style={styles.walletAddress}>
                                    {formatWalletAddress(walletAddress)}
                                </Text>
                            </View>
                        )}

                        <Button
                            title={
                                walletConnected
                                    ? 'Continue with Wallet'
                                    : 'Connect Wallet'
                            }
                            onPress={handleWalletAuth}
                            loading={loading}
                            style={styles.button}
                        />
                    </Card>

                    <Text style={styles.footer}>
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </Text>
                </CustomList>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    scrollContent: {
        flexGrow: 1,
        padding: theme.spacing.lg,
        justifyContent: 'center',
        backgroundColor: theme.colors.background.primary,
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
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
    button: {
        marginTop: theme.spacing.md,
    },
    walletDescription: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.md,
    },
    walletInfo: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    walletLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
    },
    walletAddress: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    footer: {
        marginTop: theme.spacing.xl,
        textAlign: 'center',
        fontSize: 12,
        color: theme.colors.text.secondary,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
    },
});

