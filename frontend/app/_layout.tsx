import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Header } from '../components';
import { AuthProvider } from '../contexts/AuthContext';
import { NetworkProvider } from '../contexts/NetworkContext';
import { ToastProvider } from '../contexts/ToastContext';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NetworkProvider>
                <AuthProvider>
                    <ToastProvider>
                        <StatusBar style="light" />
                        <Stack>
                            <Stack.Screen
                                name="index"
                                options={{
                                    header: () => <Header title="ChainEquity" subtitle="Your Digital Securities Dashboard" />,
                                }}
                            />
                            <Stack.Screen
                                name="auth"
                                options={{
                                    header: () => <Header title="Authentication" subtitle="Connect your Solana wallet to get started" showBackButton={true} />,
                                }}
                            />
                            <Stack.Screen
                                name="link-wallet"
                                options={{
                                    header: () => <Header title="Link Wallet" subtitle="Connect your Solana wallet" showBackButton={true} />,
                                }}
                            />
                            <Stack.Screen
                                name="admin"
                                options={{
                                    headerShown: false,
                                }}
                            />
                        </Stack>
                    </ToastProvider>
                </AuthProvider>
            </NetworkProvider>
        </GestureHandlerRootView>
    );
}

