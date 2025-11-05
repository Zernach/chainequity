import { useState } from 'react';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface User {
    id: string;
    name: string;
    wallet_address?: string;
}

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/users`);
            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
                return { success: true, count: data.count };
            }
            return { success: false };
        } catch (err) {
            console.error('Error fetching users:', err);
            const errorMsg = 'Failed to fetch users. Make sure backend is running.';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    const createUser = async (name: string) => {
        if (!name.trim()) {
            const errorMsg = 'Please enter a name';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }

        setLoading(true);
        setError(null);
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
                await fetchUsers();
                return { success: true };
            }
            return { success: false };
        } catch (err) {
            console.error('Error creating user:', err);
            const errorMsg = 'Failed to create user';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    };

    return {
        users,
        loading,
        error,
        fetchUsers,
        createUser,
    };
}

