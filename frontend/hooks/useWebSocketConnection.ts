import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_MESSAGES = 10;
const RECONNECT_DELAY = 3000;

/**
 * Constructs WebSocket URL from API URL
 * Replaces http/https with ws/wss and appends /ws path
 */
function getWebSocketUrl(apiUrl: string): string {
    return apiUrl.replace(/^http/, 'ws') + '/ws';
}

interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

export function useWebSocketConnection() {
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<WebSocketMessage[]>([]);
    const ws = useRef<WebSocket | null>(null);

    const connect = useCallback(() => {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        const wsUrl = getWebSocketUrl(apiUrl);

        try {
            console.log('[WebSocket] Connecting to', wsUrl);
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connected');
                setConnected(true);
            };

            ws.current.onmessage = (event) => {
                console.log('WebSocket message:', event.data);
                try {
                    const data = JSON.parse(event.data);
                    setMessages((prev) => [data, ...prev].slice(0, MAX_MESSAGES));
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnected(false);
            };

            ws.current.onclose = () => {
                console.log('WebSocket disconnected');
                setConnected(false);
                setTimeout(() => {
                    connect();
                }, RECONNECT_DELAY);
            };
        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connect]);

    const sendMessage = useCallback((message: any) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
            return true;
        } else {
            console.error('[WebSocket] Cannot send message: not connected');
            return false;
        }
    }, []);

    const sendTestMessage = useCallback(() => {
        sendMessage({ type: 'test', message: 'Hello from frontend!' });
    }, [sendMessage]);

    return {
        connected,
        messages,
        sendMessage,
        sendTestMessage,
    };
}

