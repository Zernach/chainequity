import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { theme } from '../constants/theme';

interface UserManagementProps {
    onCreateUser: (name: string) => Promise<boolean>;
    onFetchUsers: () => void;
    loading: boolean;
}

export function UserManagement({ onCreateUser, onFetchUsers, loading }: UserManagementProps) {
    const [name, setName] = useState('');

    const handleCreateUser = async () => {
        const success = await onCreateUser(name);
        if (success) {
            setName('');
        }
    };

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Management</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter user name"
                placeholderTextColor={theme.colors.text.placeholder}
                value={name}
                onChangeText={setName}
            />
            <TouchableOpacity style={styles.button} onPress={handleCreateUser} disabled={loading}>
                <Text style={styles.buttonText}>Create User</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonSecondary} onPress={onFetchUsers} disabled={loading}>
                <Text style={styles.buttonText}>Get All Users</Text>
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
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
        backgroundColor: theme.colors.background.tertiary,
        color: theme.colors.text.primary,
    },
    button: {
        backgroundColor: theme.colors.primary.default,
        padding: 14,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 8,
    },
    buttonSecondary: {
        backgroundColor: theme.colors.secondary.default,
        padding: 14,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 8,
    },
    buttonText: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
});

