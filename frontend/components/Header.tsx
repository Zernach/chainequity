import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';
import { useAuth } from '../hooks';
import { useNetwork, type SolanaNetwork } from '../contexts/NetworkContext';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    showConnectionStatus?: boolean;
    showBackButton?: boolean;
}

export function Header({
    title,
    subtitle,
    showConnectionStatus = true,
    showBackButton = false,
}: HeaderProps) {
    const router = useRouter();
    const { connected } = useWebSocketConnection();
    const { user, signOut } = useAuth();
    const { network, setNetwork } = useNetwork();
    const [showWalletDropdown, setShowWalletDropdown] = useState(false);
    const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);

    const walletAddress = user?.wallet_address;
    const shortWalletAddress = walletAddress
        ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
        : null;

    const networkLabels: Record<SolanaNetwork, string> = {
        'devnet': 'Devnet',
        'testnet': 'Testnet',
    };

    const handleManage = () => {
        setShowWalletDropdown(false);
        router.push('/link-wallet');
    };

    const handleSignOut = async () => {
        setShowWalletDropdown(false);
        await signOut();
        router.replace('/auth');
    };

    const handleNetworkChange = async (newNetwork: SolanaNetwork) => {
        setShowNetworkDropdown(false);
        await setNetwork(newNetwork);
    };

    return (
        <View style={styles.container}>
            {showBackButton && (
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
                    accessibilityLabel="Go back"
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
            )}

            <View style={[styles.titleContainer, showBackButton && styles.titleWithBack]}>
                {title && <Text style={styles.title}>{title}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            <View style={styles.rightContainer}>
                {showConnectionStatus && (
                    <View>
                        <TouchableOpacity
                            style={styles.statusContainer}
                            onPress={() => setShowNetworkDropdown(!showNetworkDropdown)}
                            accessibilityLabel="Network menu"
                        >
                            <View style={[
                                styles.statusDot,
                                connected ? styles.connectedDot : styles.disconnectedDot
                            ]} />
                            <Text style={styles.statusText}>
                                {networkLabels[network]}
                            </Text>
                            <Text style={styles.caretText}>▼</Text>
                        </TouchableOpacity>

                        <Modal
                            visible={showNetworkDropdown}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setShowNetworkDropdown(false)}
                        >
                            <Pressable
                                style={styles.modalOverlay}
                                onPress={() => setShowNetworkDropdown(false)}
                            >
                                <View style={styles.dropdownContainer}>
                                    <TouchableOpacity
                                        style={styles.dropdownItem}
                                        onPress={() => handleNetworkChange('devnet')}
                                    >
                                        <View style={styles.networkItemContainer}>
                                            <Text style={[
                                                styles.dropdownItemText,
                                                network === 'devnet' && styles.activeNetworkText
                                            ]}>
                                                Devnet
                                            </Text>
                                            {network === 'devnet' && (
                                                <Text style={styles.checkmark}>✓</Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                    <View style={styles.dropdownDivider} />
                                    <TouchableOpacity
                                        style={styles.dropdownItem}
                                        onPress={() => handleNetworkChange('testnet')}
                                    >
                                        <View style={styles.networkItemContainer}>
                                            <Text style={[
                                                styles.dropdownItemText,
                                                network === 'testnet' && styles.activeNetworkText
                                            ]}>
                                                Testnet
                                            </Text>
                                            {network === 'testnet' && (
                                                <Text style={styles.checkmark}>✓</Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </Pressable>
                        </Modal>
                    </View>
                )}

                {walletAddress && (
                    <View>
                        <TouchableOpacity
                            style={styles.walletButton}
                            onPress={() => setShowWalletDropdown(!showWalletDropdown)}
                            accessibilityLabel="Wallet menu"
                        >
                            <Text style={styles.walletText}>{shortWalletAddress}</Text>
                            <Text style={styles.caretText}>▼</Text>
                        </TouchableOpacity>

                        <Modal
                            visible={showWalletDropdown}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setShowWalletDropdown(false)}
                        >
                            <Pressable
                                style={styles.modalOverlay}
                                onPress={() => setShowWalletDropdown(false)}
                            >
                                <View style={styles.dropdownContainer}>
                                    <TouchableOpacity
                                        style={styles.dropdownItem}
                                        onPress={handleManage}
                                    >
                                        <Text style={styles.dropdownItemText}>Manage Wallet</Text>
                                    </TouchableOpacity>
                                    <View style={styles.dropdownDivider} />
                                    <TouchableOpacity
                                        style={styles.dropdownItem}
                                        onPress={handleSignOut}
                                    >
                                        <Text style={[styles.dropdownItemText, styles.signOutText]}>
                                            Sign Out
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </Pressable>
                        </Modal>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.background.secondary,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
        ...theme.shadow.sm,
    },
    backButton: {
        marginRight: theme.spacing.md,
        padding: theme.spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: theme.typography.fontSize['3xl'],
        color: theme.colors.text.primary,
        fontWeight: theme.typography.fontWeight.bold,
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'column',
    },
    titleWithBack: {
        marginLeft: 0,
    },
    title: {
        fontSize: theme.typography.fontSize['2xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.text.secondary,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.background.tertiary,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        gap: theme.spacing.xs,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: theme.radius.full,
        marginRight: theme.spacing.xs,
    },
    connectedDot: {
        backgroundColor: theme.colors.status.connected,
    },
    disconnectedDot: {
        backgroundColor: theme.colors.status.disconnected,
    },
    statusText: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.text.secondary,
    },
    walletButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.background.tertiary,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        gap: theme.spacing.xs,
    },
    walletText: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.text.primary,
    },
    caretText: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.text.secondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60,
        paddingRight: theme.spacing.lg,
    },
    dropdownContainer: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        minWidth: 180,
        ...theme.shadow.lg,
    },
    dropdownItem: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    dropdownItemText: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.text.primary,
    },
    dropdownDivider: {
        height: 1,
        backgroundColor: theme.colors.border.default,
    },
    signOutText: {
        color: theme.colors.error.default,
    },
    networkItemContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    activeNetworkText: {
        color: theme.colors.primary.default,
        fontWeight: theme.typography.fontWeight.bold,
    },
    checkmark: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.primary.default,
        fontWeight: theme.typography.fontWeight.bold,
    },
});

