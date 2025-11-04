import { useState } from 'react';
import { Alert } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface User {
    id: string;
    name: string;
    wallet_address?: string;
}

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/users`);
            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
                Alert.alert('Success', `Fetched ${data.count} users`);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Error', 'Failed to fetch users. Make sure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const createUser = async (name: string): Promise<boolean> => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a name');
            return false;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            });
            const data = await response.json();
            if (data.success) {
                Alert.alert('Success', 'User created!');
                await fetchUsers();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error creating user:', error);
            Alert.alert('Error', 'Failed to create user');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        users,
        loading,
        fetchUsers,
        createUser,
    };
}

