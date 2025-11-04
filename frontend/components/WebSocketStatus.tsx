import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';

interface WebSocketStatusProps {
    connected: boolean;
    onSendTestMessage: () => void;
}

export function WebSocketStatus({ connected, onSendTestMessage }: WebSocketStatusProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>WebSocket Status</Text>
            <View style={[styles.statusBadge, connected ? styles.connected : styles.disconnected]}>
                <Text style={styles.statusText}>
                    {connected ? '🟢 Connected' : '🔴 Disconnected'}
                </Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={onSendTestMessage}>
                <Text style={styles.buttonText}>Send Test Message</Text>
            </TouchableOpacity>
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
    statusBadge: {
        padding: 12,
        borderRadius: 6,
        marginBottom: 12,
    },
    connected: {
        backgroundColor: theme.colors.success.bg,
    },
    disconnected: {
        backgroundColor: theme.colors.error.bg,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        color: theme.colors.text.primary,
    },
    button: {
        backgroundColor: theme.colors.primary.default,
        padding: 14,
        borderRadius: 6,
        alignItems: 'center',
    },
    buttonText: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
});

