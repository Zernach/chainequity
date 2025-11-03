import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../constants/theme';

export default function RootLayout() {
    return (
        <>
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
            </Stack>
        </>
    );
}

