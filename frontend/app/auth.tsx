/**
 * Authentication Screen
 * Handles email/password login/signup and wallet-based authentication
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useWalletConnection, formatWalletAddress } from '../hooks/useWalletConnection';
import { generateSignatureMessage, requestNonce } from '../services/auth';
import { Input, Button, LoadingSpinner, Card } from '../components';
import { theme } from '../constants';

export default function AuthScreen() {
    const router = useRouter();
    const { signUp, signIn, walletLogin, loading: authLoading } = useAuth();
    const {
        connected: walletConnected,
        walletAddress,
        connect: connectWallet,
        signMessage,
        connecting: walletConnecting,
    } = useWalletConnection();

    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
    });
    const [errors, setErrors] = useState({
        email: '',
        password: '',
        name: '',
    });

    const isLogin = mode === 'login';
    const loading = authLoading || walletConnecting;

    // Validate form
    const validate = (): boolean => {
        const newErrors = {
            email: '',
            password: '',
            name: '',
        };

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (!isLogin && !formData.name) {
            newErrors.name = 'Name is required';
        }

        setErrors(newErrors);
        return !Object.values(newErrors).some((error) => error !== '');
    };

    // Handle email/password auth
    const handleEmailAuth = async () => {
        if (!validate()) return;

        try {
            if (isLogin) {
                await signIn({
                    email: formData.email,
                    password: formData.password,
                });
            } else {
                await signUp({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                });
            }

            // Navigate to home on success
            router.replace('/');
        } catch (error) {
            Alert.alert(
                'Authentication Error',
                error instanceof Error ? error.message : 'Authentication failed'
            );
        }
    };

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
        } catch (error) {
            console.error('[AuthScreen] Wallet auth error:', error);
            Alert.alert(
                'Wallet Authentication Error',
                error instanceof Error ? error.message : 'Wallet authentication failed'
            );
        }
    };

    const toggleMode = () => {
        setMode(isLogin ? 'signup' : 'login');
        setErrors({ email: '', password: '', name: '' });
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.title}>ChainEquity</Text>
                    <Text style={styles.subtitle}>
                        {isLogin ? 'Sign in to your account' : 'Create your account'}
                    </Text>
                </View>

                {/* Email/Password Form */}
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>
                        {isLogin ? 'Login' : 'Sign Up'}
                    </Text>

                    {!isLogin && (
                        <Input
                            label="Name"
                            placeholder="Enter your name"
                            value={formData.name}
                            onChangeText={(name) => setFormData({ ...formData, name })}
                            error={errors.name}
                            autoCapitalize="words"
                            editable={!loading}
                        />
                    )}

                    <Input
                        label="Email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChangeText={(email) => setFormData({ ...formData, email })}
                        error={errors.email}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                    />

                    <Input
                        label="Password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChangeText={(password) => setFormData({ ...formData, password })}
                        error={errors.password}
                        secureTextEntry
                        editable={!loading}
                    />

                    <Button
                        title={isLogin ? 'Login' : 'Sign Up'}
                        onPress={handleEmailAuth}
                        loading={loading}
                        style={styles.button}
                    />

                    <TouchableOpacity onPress={toggleMode} disabled={loading}>
                        <Text style={styles.toggleText}>
                            {isLogin
                                ? "Don't have an account? Sign up"
                                : 'Already have an account? Login'}
                        </Text>
                    </TouchableOpacity>
                </Card>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Wallet Auth */}
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>Connect with Wallet</Text>
                    <Text style={styles.walletDescription}>
                        Sign in or create an account using your Solana wallet
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
                        variant="secondary"
                        style={styles.button}
                    />
                </Card>

                <Text style={styles.footer}>
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
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
    toggleText: {
        marginTop: theme.spacing.md,
        textAlign: 'center',
        color: theme.colors.primary.light,
        fontSize: 14,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: theme.spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border.default,
    },
    dividerText: {
        marginHorizontal: theme.spacing.md,
        color: theme.colors.text.secondary,
        fontSize: 14,
        fontWeight: '500',
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
    },
});

