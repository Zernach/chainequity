import { Stack } from 'expo-router';
import { Header } from '../../components';

export default function AdminLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    header: () => <Header title="Admin Dashboard" subtitle="Manage tokens, users, and corporate actions" showBackButton={true} />,
                }}
            />
            <Stack.Screen
                name="users"
                options={{
                    header: () => <Header title="User Management" subtitle="View and manage user accounts" showBackButton={true} />,
                }}
            />
            <Stack.Screen
                name="allowlist"
                options={{
                    header: () => <Header title="Allowlist Management" subtitle="Control wallet transfer permissions" showBackButton={true} />,
                }}
            />
            <Stack.Screen
                name="mint"
                options={{
                    header: () => <Header title="Mint Tokens" subtitle="Issue new security tokens" showBackButton={true} />,
                }}
            />
            <Stack.Screen
                name="corporate-actions"
                options={{
                    header: () => <Header title="Corporate Actions" subtitle="Process dividends, stock splits, and more" showBackButton={true} />,
                }}
            />
            <Stack.Screen
                name="cap-table"
                options={{
                    header: () => <Header title="Cap Table" subtitle="View ownership structure and reports" showBackButton={true} />,
                }}
            />
            <Stack.Screen
                name="token-init"
                options={{
                    header: () => <Header title="Initialize Token" subtitle="Create a new security token" showBackButton={true} />,
                }}
            />
            <Stack.Screen
                name="transfers"
                options={{
                    header: () => <Header title="Transaction History" subtitle="View all token transfers" showBackButton={true} />,
                }}
            />
        </Stack>
    );
}

