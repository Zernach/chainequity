import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SolanaNetwork = 'devnet' | 'testnet';

interface NetworkContextType {
    network: SolanaNetwork;
    setNetwork: (network: SolanaNetwork) => Promise<void>;
    isLoading: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const NETWORK_STORAGE_KEY = '@chainequity:solana_network';

interface NetworkProviderProps {
    children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
    const [network, setNetworkState] = useState<SolanaNetwork>('devnet');
    const [isLoading, setIsLoading] = useState(true);

    // Load saved network preference on mount
    useEffect(() => {
        const loadNetwork = async () => {
            try {
                const savedNetwork = await AsyncStorage.getItem(NETWORK_STORAGE_KEY);
                if (savedNetwork && ['devnet', 'testnet'].includes(savedNetwork)) {
                    setNetworkState(savedNetwork as SolanaNetwork);
                }
            } catch (error) {
                console.error('[NetworkContext] Error loading network preference:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadNetwork();
    }, []);

    const setNetwork = async (newNetwork: SolanaNetwork) => {
        try {
            await AsyncStorage.setItem(NETWORK_STORAGE_KEY, newNetwork);
            setNetworkState(newNetwork);
            console.log(`[NetworkContext] Switched to ${newNetwork}`);
        } catch (error) {
            console.error('[NetworkContext] Error saving network preference:', error);
            throw error;
        }
    };

    return (
        <NetworkContext.Provider value={{ network, setNetwork, isLoading }}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    const context = useContext(NetworkContext);
    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
}

