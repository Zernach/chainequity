import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components';
import { AuthProvider } from '../contexts/AuthContext';
import { NetworkProvider } from '../contexts/NetworkContext';

export default function RootLayout() {
    return (
        <NetworkProvider>
            <AuthProvider>
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
                            header: () => <Header title="Authentication" subtitle="Sign in or create an account" showBackButton={true} />,
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
            </AuthProvider>
        </NetworkProvider>
    );
}

