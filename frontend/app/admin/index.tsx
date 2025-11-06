import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Button, CustomList } from '../../components';
import { theme } from '../../constants';

/**
 * Admin Dashboard
 * Central hub for all administrative functions
 */
export default function AdminDashboard() {
    const router = useRouter();

    return (
        <CustomList scrollViewProps={{ style: styles.container }}>
            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Token Management</Text>
                <Text style={styles.sectionDescription}>
                    Initialize new security tokens with compliance gating
                </Text>
                <Button
                    title="Initialize New Token"
                    onPress={() => router.push('/admin/token-init' as any)}
                    variant="primary"
                />
            </Card>

            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Allowlist Management</Text>
                <Text style={styles.sectionDescription}>
                    Approve or revoke wallet addresses for token transfers
                </Text>
                <Button
                    title="Manage Allowlist"
                    onPress={() => router.push('/admin/allowlist')}
                    variant="primary"
                />
            </Card>

            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Token Operations</Text>
                <Text style={styles.sectionDescription}>
                    Mint tokens to approved wallets
                </Text>
                <Button
                    title="Mint Tokens"
                    onPress={() => router.push('/admin/mint')}
                    variant="primary"
                />
            </Card>

            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Corporate Actions</Text>
                <Text style={styles.sectionDescription}>
                    Execute stock splits and symbol changes
                </Text>
                <Button
                    title="Execute Corporate Actions"
                    onPress={() => router.push('/admin/corporate-actions')}
                    variant="primary"
                />
            </Card>

            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>User Management</Text>
                <Text style={styles.sectionDescription}>
                    Create and manage user accounts
                </Text>
                <Button
                    title="Manage Users"
                    onPress={() => router.push('/admin/users' as any)}
                    variant="primary"
                />
            </Card>

            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Reports & Analytics</Text>
                <Text style={styles.sectionDescription}>
                    View cap tables and transaction history
                </Text>
                <View style={styles.buttonRow}>
                    <Button
                        title="Cap Table"
                        onPress={() => router.push('/admin/cap-table')}
                        variant="secondary"
                        style={styles.halfButton}
                    />
                    <Button
                        title="Transactions"
                        onPress={() => router.push('/admin/transfers' as any)}
                        variant="secondary"
                        style={styles.halfButton}
                    />
                </View>
            </Card>
        </CustomList>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    sectionCard: {
        marginBottom: theme.spacing.md,
        marginTop: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    sectionDescription: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.md,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfButton: {
        flex: 1,
        marginHorizontal: theme.spacing.xs,
    },
});

