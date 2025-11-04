import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../constants/theme';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
    return (
        <AuthProvider>
            <StatusBar style="light" />
            <Stack>
                <Stack.Screen
                    name="index"
                    options={{
                        title: 'ChainEquity Home',
                        headerStyle: {
                            backgroundColor: theme.colors.background.secondary,
                        },
                        headerTintColor: theme.colors.text.primary,
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                    }}
                />
                <Stack.Screen
                    name="auth"
                    options={{
                        title: 'Authentication',
                        headerStyle: {
                            backgroundColor: theme.colors.background.secondary,
                        },
                        headerTintColor: theme.colors.text.primary,
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                        headerBackTitle: 'Back',
                    }}
                />
                <Stack.Screen
                    name="link-wallet"
                    options={{
                        title: 'Link Wallet',
                        headerStyle: {
                            backgroundColor: theme.colors.background.secondary,
                        },
                        headerTintColor: theme.colors.text.primary,
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                        headerBackTitle: 'Back',
                    }}
                />
            </Stack>
        </AuthProvider>
    );
}

