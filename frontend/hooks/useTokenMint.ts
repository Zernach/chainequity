import { useState } from 'react';
import { Alert } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface MintResult {
    success: boolean;
    signature?: string;
    network?: string;
    error?: string;
    [key: string]: any;
}

export function useTokenMint() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<MintResult | null>(null);

    const mintToken = async (amount: number = 1) => {
        setLoading(true);
        setResult(null);
        try {
            const response = await fetch(`${API_URL}/mint-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount }),
            });
            const data = await response.json();
            setResult(data);
            if (data.success) {
                Alert.alert(
                    'Token Minted!',
                    `Successfully minted on ${data.network}\nSignature: ${data.signature.slice(0, 20)}...`
                );
            } else {
                Alert.alert('Error', data.error || 'Failed to mint token');
            }
            return data;
        } catch (error) {
            console.error('Error minting token:', error);
            Alert.alert('Error', 'Failed to mint token');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        result,
        mintToken,
    };
}

