import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../../constants';
import { CustomList } from '../../components';
import { UserManagement, UsersList, Card } from '../../components';
import { useUsers } from '../../hooks';

/**
 * User Management Admin Screen
 * Allows admins to create and manage users
 */
export default function AdminUsersScreen() {
    const { users, loading, createUser, fetchUsers } = useUsers();

    return (
        <CustomList scrollViewProps={{ style: styles.container }}>
            <Card style={styles.headerCard}>
                <Text style={styles.title}>User Management</Text>
                <Text style={styles.description}>
                    Create new users and manage existing accounts
                </Text>
            </Card>

            <UserManagement
                onCreateUser={createUser}
                onFetchUsers={fetchUsers}
                loading={loading}
            />

            <UsersList users={users} />

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary.default} />
                </View>
            )}
        </CustomList>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    headerCard: {
        marginBottom: theme.spacing.md,
        marginTop: theme.spacing.md,
    },
    title: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    description: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
    },
    loadingOverlay: {
        padding: 20,
        alignItems: 'center',
    },
});

