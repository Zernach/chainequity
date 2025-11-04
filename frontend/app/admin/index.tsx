import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Button } from '../../components';
import { theme } from '../../constants';

/**
 * Admin Dashboard
 * Central hub for all administrative functions
 */
export default function AdminDashboard() {
    const router = useRouter();

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.headerCard}>
                <Text style={styles.title}>Admin Dashboard</Text>
                <Text style={styles.subtitle}>
                    Manage tokenized securities, allowlists, and corporate actions
                </Text>
            </Card>

            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Token Management</Text>
                <Text style={styles.sectionDescription}>
                    Initialize new security tokens with compliance gating
                </Text>
                <Button
                    onPress={() => router.push('/admin/token-init')}
                    variant="primary"
                >
                    Initialize New Token
                </Button>
            </Card>

            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Allowlist Management</Text>
                <Text style={styles.sectionDescription}>
                    Approve or revoke wallet addresses for token transfers
                </Text>
                <Button
                    onPress={() => router.push('/admin/allowlist')}
                    variant="primary"
                >
                    Manage Allowlist
                </Button>
            </Card>

            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Token Operations</Text>
                <Text style={styles.sectionDescription}>
                    Mint tokens to approved wallets
                </Text>
                <Button
                    onPress={() => router.push('/admin/mint')}
                    variant="primary"
                >
                    Mint Tokens
                </Button>
            </Card>

            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Corporate Actions</Text>
                <Text style={styles.sectionDescription}>
                    Execute stock splits and symbol changes
                </Text>
                <Button
                    onPress={() => router.push('/admin/corporate-actions')}
                    variant="primary"
                >
                    Execute Corporate Actions
                </Button>
            </Card>

            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Reports & Analytics</Text>
                <Text style={styles.sectionDescription}>
                    View cap tables and transaction history
                </Text>
                <View style={styles.buttonRow}>
                    <Button
                        onPress={() => router.push('/admin/cap-table')}
                        variant="secondary"
                        style={styles.halfButton}
                    >
                        Cap Table
                    </Button>
                    <Button
                        onPress={() => router.push('/admin/transfers')}
                        variant="secondary"
                        style={styles.halfButton}
                    >
                        Transactions
                    </Button>
                </View>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    headerCard: {
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.text.secondary,
    },
    sectionCard: {
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        ...theme.typography.h3,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    sectionDescription: {
        ...theme.typography.small,
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

