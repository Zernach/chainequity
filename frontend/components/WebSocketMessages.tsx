import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

interface WebSocketMessagesProps {
    messages: WebSocketMessage[];
}

export function WebSocketMessages({ messages }: WebSocketMessagesProps) {
    if (messages.length === 0) {
        return null;
    }

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Messages</Text>
            {messages.map((msg, idx) => (
                <View key={idx} style={styles.messageBox}>
                    <Text style={styles.messageType}>{msg.type}</Text>
                    <Text style={styles.messageContent}>{JSON.stringify(msg, null, 2)}</Text>
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
    messageBox: {
        backgroundColor: theme.colors.background.tertiary,
        padding: 10,
        borderRadius: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    messageType: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.primary.light,
        marginBottom: 4,
    },
    messageContent: {
        fontSize: 11,
        color: theme.colors.text.secondary,
        fontFamily: 'monospace',
    },
});

