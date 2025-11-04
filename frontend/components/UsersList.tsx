import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface User {
    id: string;
    name: string;
    wallet_address?: string;
}

interface UsersListProps {
    users: User[];
}

export function UsersList({ users }: UsersListProps) {
    if (users.length === 0) {
        return null;
    }

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Users ({users.length})</Text>
            {users.map((user) => (
                <View key={user.id} style={styles.userCard}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userDetail}>ID: {user.id.slice(0, 8)}...</Text>
                    {user.wallet_address && (
                        <Text style={styles.userDetail}>Wallet: {user.wallet_address}</Text>
                    )}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginVertical: 12,
        padding: 16,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: theme.colors.text.primary,
    },
    userCard: {
        backgroundColor: theme.colors.background.tertiary,
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        color: theme.colors.text.primary,
    },
    userDetail: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
});

