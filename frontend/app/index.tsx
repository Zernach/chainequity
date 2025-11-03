import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import HelloWorld from '../components/HelloWorld';

// Configuration - update these for your environment
const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3001';

export default function HomeScreen() {
    const [users, setUsers] = useState<any[]>([]);
    const [newUserName, setNewUserName] = useState('');
    const [loading, setLoading] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [wsMessages, setWsMessages] = useState<any[]>([]);
    const [mintResult, setMintResult] = useState<any>(null);
    const ws = useRef<WebSocket | null>(null);

    // Connect to WebSocket on mount
    useEffect(() => {
        connectWebSocket();
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const connectWebSocket = () => {
        try {
            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = () => {
                console.log('WebSocket connected');
                setWsConnected(true);
            };

            ws.current.onmessage = (event) => {
                console.log('WebSocket message:', event.data);
                try {
                    const data = JSON.parse(event.data);
                    setWsMessages((prev) => [data, ...prev].slice(0, 10)); // Keep last 10 messages
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setWsConnected(false);
            };

            ws.current.onclose = () => {
                console.log('WebSocket disconnected');
                setWsConnected(false);
                // Reconnect after 3 seconds
                setTimeout(() => {
                    connectWebSocket();
                }, 3000);
            };
        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
        }
    };

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

    const createUser = async () => {
        if (!newUserName.trim()) {
            Alert.alert('Error', 'Please enter a name');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newUserName }),
            });
            const data = await response.json();
            if (data.success) {
                Alert.alert('Success', 'User created!');
                setNewUserName('');
                fetchUsers();
            }
        } catch (error) {
            console.error('Error creating user:', error);
            Alert.alert('Error', 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const mintSolanaToken = async () => {
        setLoading(true);
        setMintResult(null);
        try {
            const response = await fetch(`${API_URL}/mint-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount: 1 }),
            });
            const data = await response.json();
            setMintResult(data);
            if (data.success) {
                Alert.alert(
                    'Token Minted!',
                    `Successfully minted on ${data.network}\nSignature: ${data.signature.slice(0, 20)}...`
                );
            } else {
                Alert.alert('Error', data.error || 'Failed to mint token');
            }
        } catch (error) {
            console.error('Error minting token:', error);
            Alert.alert('Error', 'Failed to mint token');
        } finally {
            setLoading(false);
        }
    };

    const sendTestMessage = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'test', message: 'Hello from frontend!' }));
        } else {
            Alert.alert('Error', 'WebSocket not connected');
        }
    };

    return (
        <ScrollView style={styles.container}>
            <HelloWorld />

            {/* WebSocket Status */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>WebSocket Status</Text>
                <View style={[styles.statusBadge, wsConnected ? styles.connected : styles.disconnected]}>
                    <Text style={styles.statusText}>
                        {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.button} onPress={sendTestMessage}>
                    <Text style={styles.buttonText}>Send Test Message</Text>
                </TouchableOpacity>
            </View>

            {/* WebSocket Messages */}
            {wsMessages.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Messages</Text>
                    {wsMessages.map((msg, idx) => (
                        <View key={idx} style={styles.messageBox}>
                            <Text style={styles.messageType}>{msg.type}</Text>
                            <Text style={styles.messageContent}>{JSON.stringify(msg, null, 2)}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* User Management */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>User Management</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter user name"
                    value={newUserName}
                    onChangeText={setNewUserName}
                />
                <TouchableOpacity style={styles.button} onPress={createUser} disabled={loading}>
                    <Text style={styles.buttonText}>Create User</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buttonSecondary} onPress={fetchUsers} disabled={loading}>
                    <Text style={styles.buttonText}>Get All Users</Text>
                </TouchableOpacity>
            </View>

            {/* Users List */}
            {users.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Users ({users.length})</Text>
                    {users.map((user) => (
                        <View key={user.id} style={styles.userCard}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <Text style={styles.userDetail}>ID: {user.id.slice(0, 8)}...</Text>
                            {user.wallet_address && (
                                <Text style={styles.userDetail}>Wallet: {user.wallet_address}</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* Solana Token Minting */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Solana Token Minting</Text>
                <TouchableOpacity style={styles.buttonPrimary} onPress={mintSolanaToken} disabled={loading}>
                    <Text style={styles.buttonText}>Mint 1 SOL (Devnet)</Text>
                </TouchableOpacity>
                {mintResult && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultTitle}>
                            {mintResult.success ? '✅ Success' : '❌ Failed'}
                        </Text>
                        <Text style={styles.resultText}>{JSON.stringify(mintResult, null, 2)}</Text>
                    </View>
                )}
            </View>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    section: {
        marginVertical: 12,
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#111827',
    },
    statusBadge: {
        padding: 12,
        borderRadius: 6,
        marginBottom: 12,
    },
    connected: {
        backgroundColor: '#d1fae5',
    },
    disconnected: {
        backgroundColor: '#fee2e2',
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#6366f1',
        padding: 14,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 8,
    },
    buttonSecondary: {
        backgroundColor: '#8b5cf6',
        padding: 14,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 8,
    },
    buttonPrimary: {
        backgroundColor: '#10b981',
        padding: 14,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    userCard: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#111827',
    },
    userDetail: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    messageBox: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    messageType: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6366f1',
        marginBottom: 4,
    },
    messageContent: {
        fontSize: 11,
        color: '#374151',
        fontFamily: 'monospace',
    },
    resultBox: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 6,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    resultTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    resultText: {
        fontSize: 11,
        color: '#374151',
        fontFamily: 'monospace',
    },
    loadingOverlay: {
        padding: 20,
        alignItems: 'center',
    },
});

