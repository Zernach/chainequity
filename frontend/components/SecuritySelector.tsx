import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Button, Badge, CustomList } from './index';
import { theme } from '../constants';
import { api } from '../services/api';
import type { Security } from '../services/handlers/token.handler';

interface SecuritySelectorProps {
    /** Callback when a security is selected */
    onSecuritySelected: (security: Security | null) => void;
    /** Currently selected security (for controlled component) */
    selectedSecurity?: Security | null;
    /** Optional custom warning message when no securities exist */
    emptyMessage?: string;
    /** Optional callback for external error handling */
    onError?: (title: string, message: string) => void;
    /** Optional callback for external warning handling */
    onWarning?: (title: string, message: string) => void;
}

/**
 * SecuritySelector Component
 * Reusable component for selecting securities across admin screens
 * 
 * Features:
 * - Load and display all securities
 * - Visual selection state with Badge
 * - Refresh functionality
 * - Loading and empty states
 * - Display selected security info
 */
export default function SecuritySelector({
    onSecuritySelected,
    selectedSecurity = null,
    emptyMessage = 'No securities found. Initialize a token first.',
    onError,
    onWarning,
}: SecuritySelectorProps) {
    const [securities, setSecurities] = useState<Security[]>([]);
    const [loadingSecurities, setLoadingSecurities] = useState(false);

    // Load securities on mount
    useEffect(() => {
        loadSecurities();
    }, []);

    const loadSecurities = async () => {
        setLoadingSecurities(true);
        try {
            const result = await api.getAllSecurities();
            if (result.success) {
                setSecurities(result.securities || []);
                if (result.securities.length === 0 && onWarning) {
                    onWarning(
                        'No Securities Found',
                        'You need to initialize a token first.'
                    );
                }
            }
        } catch (err) {
            if (onError) {
                onError('Error', 'Failed to load securities: ' + (err as Error).message);
            }
        } finally {
            setLoadingSecurities(false);
        }
    };

    const handleSecurityPress = (security: Security) => {
        // Toggle selection if same security is pressed
        if (selectedSecurity?.id === security.id) {
            onSecuritySelected(null);
        } else {
            onSecuritySelected(security);
        }
    };

    const renderSecurityItem = ({ item }: { item: Security }) => (
        <TouchableOpacity
            style={[
                styles.securityItem,
                selectedSecurity?.id === item.id && styles.securityItemSelected,
            ]}
            onPress={() => handleSecurityPress(item)}
        >
            <View style={styles.securityInfo}>
                <Text style={styles.securitySymbol}>{item.symbol}</Text>
                <Text style={styles.securityName}>{item.name}</Text>
                <Text style={styles.securityMint} numberOfLines={1}>
                    {item.mint_address}
                </Text>
            </View>
            {selectedSecurity?.id === item.id && (
                <Badge variant="success">Selected</Badge>
            )}
        </TouchableOpacity>
    );

    return (
        <Card>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Select Security</Text>
                <Button
                    title="Refresh"
                    variant="secondary"
                    size="sm"
                    onPress={loadSecurities}
                    loading={loadingSecurities}
                />
            </View>

            {loadingSecurities ? (
                <Text style={styles.loadingText}>Loading securities...</Text>
            ) : securities.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateText}>{emptyMessage}</Text>
                </View>
            ) : (
                <CustomList
                    flatListProps={{
                        data: securities,
                        renderItem: renderSecurityItem,
                        keyExtractor: (item) => item.id,
                        scrollEnabled: false,
                    }}
                />
            )}

            {selectedSecurity && (
                <View style={styles.selectedSecurityInfo}>
                    <Text style={styles.infoLabel}>Selected Token:</Text>
                    <Text style={styles.infoValue}>
                        {selectedSecurity.symbol} - {selectedSecurity.name}
                    </Text>
                    <Text style={styles.infoMintAddress}>
                        {selectedSecurity.mint_address}
                    </Text>
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
    },
    securityItem: {
        padding: theme.spacing.md,
        borderWidth: 2,
        borderColor: theme.colors.border.default,
        borderRadius: 8,
        marginBottom: theme.spacing.sm,
        backgroundColor: theme.colors.background.secondary,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    securityItemSelected: {
        borderColor: theme.colors.primary.default,
        backgroundColor: theme.colors.primary.dark,
    },
    securityInfo: {
        flex: 1,
    },
    securitySymbol: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
    },
    securityName: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    securityMint: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.tertiary,
        marginTop: 4,
        fontFamily: 'monospace',
    },
    selectedSecurityInfo: {
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background.tertiary,
        borderRadius: 8,
    },
    infoLabel: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.secondary,
    },
    infoValue: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.primary,
        marginTop: 4,
    },
    infoMintAddress: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.tertiary,
        marginTop: 4,
        fontFamily: 'monospace',
    },
    emptyStateContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        textAlign: 'center',
    },
    loadingText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        paddingVertical: theme.spacing.md,
    },
});

