import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Button, Input, Modal, CustomList } from '../../components';
import { theme } from '../../constants';
import { api } from '../../services/api';
import { useToast } from '../../hooks';

/**
 * Token Initialization Screen
 * Create new gated security tokens
 */
export default function TokenInitialization() {
    const router = useRouter();
    const toast = useToast();
    const [symbol, setSymbol] = useState('');
    const [name, setName] = useState('');
    const [decimals, setDecimals] = useState('9');
    const [loading, setLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [lastInitializedMint, setLastInitializedMint] = useState<string | null>(null);

    const handleValidation = () => {
        console.log('[TokenInit] handleValidation called');
        console.log('[TokenInit] Current values:', { symbol, name, decimals });

        if (!symbol || !name) {
            console.log('[TokenInit] Validation failed: missing symbol or name');
            toast.warning('Symbol and name are required');
            return false;
        }

        const parsedDecimals = parseInt(decimals, 10);
        if (isNaN(parsedDecimals) || parsedDecimals < 0 || parsedDecimals > 9) {
            console.log('[TokenInit] Validation failed: invalid decimals', parsedDecimals);
            toast.warning('Decimals must be between 0 and 9');
            return false;
        }

        if (symbol.length < 3 || symbol.length > 10) {
            console.log('[TokenInit] Validation failed: invalid symbol length', symbol.length);
            toast.warning('Symbol must be 3-10 characters');
            return false;
        }

        if (name.length < 2 || name.length > 50) {
            console.log('[TokenInit] Validation failed: invalid name length', name.length);
            toast.warning('Name must be 2-50 characters');
            return false;
        }

        console.log('[TokenInit] Validation passed!');
        return true;
    };

    const showConfirmation = () => {
        console.log('[TokenInit] showConfirmation called');

        if (!handleValidation()) {
            console.log('[TokenInit] Validation failed, not showing confirmation');
            return;
        }

        console.log('[TokenInit] Opening confirmation modal');
        setShowConfirmModal(true);
    };

    const handleCancel = () => {
        console.log('[TokenInit] User cancelled initialization');
        setShowConfirmModal(false);
    };

    const handleConfirm = async () => {
        console.log('[TokenInit] User confirmed, starting initialization');
        const parsedDecimals = parseInt(decimals, 10);
        console.log('[TokenInit] Parameters:', { symbol, name, decimals: parsedDecimals });

        setShowConfirmModal(false);
        setLoading(true);

        try {
            console.log('[TokenInit] Calling api.initializeToken...');
            const result = await api.initializeToken(symbol, name, parsedDecimals);
            console.log('[TokenInit] API response received:', result);

            if (result.success) {
                console.log('[TokenInit] Success! Mint:', result.mint);
                setLastInitializedMint(result.mint);
                toast.success(`Token ${symbol} initialized successfully!`, 5000);

                // Clear form
                setSymbol('');
                setName('');
                setDecimals('9');
            } else {
                const errorMsg = (result as any).error || 'Failed to initialize token';
                console.error('[TokenInit] Failed:', errorMsg);
                toast.error(`Failed to initialize token: ${errorMsg}`, 6000);
            }
        } catch (error) {
            console.error('[TokenInit] Exception caught:', error);
            console.error('[TokenInit] Error details:', {
                message: (error as Error).message,
                stack: (error as Error).stack
            });
            toast.error(`Error: ${(error as Error).message}`, 6000);
        } finally {
            console.log('[TokenInit] Finished, setting loading to false');
            setLoading(false);
        }
    };

    return (
        <CustomList scrollViewProps={{ style: styles.container }}>
            <Card>
                <Text style={styles.title}>Initialize New Token</Text>
                <Text style={styles.description}>
                    Create a new gated security token with compliance controls
                </Text>
            </Card>

            {/* Success Message with Next Steps */}
            {lastInitializedMint && (
                <Card>
                    <View style={styles.successBox}>
                        <Text style={styles.successTitle}>✅ Token Initialized Successfully!</Text>
                        <Text style={styles.successText}>
                            Your token has been created and is ready to use.
                        </Text>
                        <View style={styles.nextStepsContainer}>
                            <Text style={styles.nextStepsTitle}>Next Steps:</Text>
                            <Text style={styles.nextStepText}>1. Add wallets to the allowlist</Text>
                            <Text style={styles.nextStepText}>2. Mint tokens to approved wallets</Text>
                        </View>
                        <View style={styles.actionButtons}>
                            <Button
                                title="Go to Allowlist"
                                onPress={() => router.push('/admin/allowlist' as any)}
                                variant="primary"
                                style={styles.actionButton}
                            />
                            <Button
                                title="Go to Mint"
                                onPress={() => router.push('/admin/mint' as any)}
                                variant="success"
                                style={styles.actionButton}
                            />
                        </View>
                        <Button
                            title="Initialize Another Token"
                            onPress={() => setLastInitializedMint(null)}
                            variant="secondary"
                            style={styles.dismissButton}
                        />
                    </View>
                </Card>
            )}

            <Card>
                <Text style={styles.sectionTitle}>Token Details</Text>
                <Input
                    label="Token Symbol"
                    value={symbol}
                    onChangeText={setSymbol}
                    placeholder="e.g., ACME"
                    maxLength={10}
                />
                <Text style={styles.hint}>3-10 characters, uppercase recommended</Text>

                <Input
                    label="Token Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., ACME Security Token"
                    maxLength={50}
                />
                <Text style={styles.hint}>2-50 characters</Text>

                <Input
                    label="Decimals"
                    value={decimals}
                    onChangeText={setDecimals}
                    placeholder="9"
                    keyboardType="numeric"
                    maxLength={1}
                />
                <Text style={styles.hint}>0-9, typically 9 for fungible tokens</Text>

                <Button
                    title="Initialize Token"
                    onPress={showConfirmation}
                    loading={loading}
                    variant="success"
                />
            </Card>

            <Card>
                <Text style={styles.sectionTitle}>What happens next?</Text>
                <View style={styles.stepContainer}>
                    <Text style={styles.stepText}>
                        1. A new SPL token mint will be created on Solana
                    </Text>
                    <Text style={styles.stepText}>
                        2. Token configuration will be stored on-chain with your settings
                    </Text>
                    <Text style={styles.stepText}>
                        3. You'll receive the mint address to use for approvals and minting
                    </Text>
                    <Text style={styles.stepText}>
                        4. Only wallets on the allowlist can hold or transfer this token
                    </Text>
                </View>
            </Card>

            <Card>
                <Text style={styles.sectionTitle}>Important Notes</Text>
                <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                        ⚠️ This is a prototype system. Do NOT use for real securities without proper legal review and compliance framework.
                    </Text>
                </View>
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        💡 After initialization, you'll need to approve wallets on the allowlist before they can receive or transfer tokens.
                    </Text>
                </View>
            </Card>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                onClose={handleCancel}
                title="Confirm Token Initialization"
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalText}>
                        Create token {symbol} ({name})?
                    </Text>
                    <Text style={styles.modalSubtext}>
                        Decimals: {decimals}
                    </Text>
                    <View style={styles.modalButtons}>
                        <Button
                            title="Cancel"
                            onPress={handleCancel}
                            variant="secondary"
                            style={styles.modalButton}
                        />
                        <Button
                            title="Initialize"
                            onPress={handleConfirm}
                            variant="success"
                            style={styles.modalButton}
                        />
                    </View>
                </View>
            </Modal>
        </CustomList>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    title: {
        fontSize: theme.typography.fontSize['2xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    description: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    hint: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
        marginTop: -theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    stepContainer: {
        marginTop: theme.spacing.sm,
    },
    stepText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.sm,
    },
    warningBox: {
        backgroundColor: theme.colors.error.bg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.error.default,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderRadius: 4,
    },
    warningText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.error.default,
    },
    infoBox: {
        backgroundColor: theme.colors.info.bg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.info.default,
        padding: theme.spacing.md,
        borderRadius: 4,
    },
    infoText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.info.default,
    },
    modalContent: {
        padding: theme.spacing.md,
    },
    modalText: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    modalSubtext: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xl,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    modalButton: {
        flex: 1,
    },
    successBox: {
        backgroundColor: theme.colors.success.bg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.success.default,
        padding: theme.spacing.lg,
        borderRadius: 4,
    },
    successTitle: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.success.default,
        marginBottom: theme.spacing.sm,
    },
    successText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    nextStepsContainer: {
        marginVertical: theme.spacing.md,
    },
    nextStepsTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
    },
    nextStepText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    actionButton: {
        flex: 1,
    },
    dismissButton: {
        marginTop: theme.spacing.sm,
    },
});

