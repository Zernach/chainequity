import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <>
            <StatusBar style="auto" />
            <Stack>
                <Stack.Screen
                    name="index"
                    options={{
                        title: 'ChainEquity Home',
                        headerStyle: {
                            backgroundColor: '#6366f1',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                    }}
                />
            </Stack>
        </>
    );
}

