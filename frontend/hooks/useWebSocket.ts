/**
 * WebSocket connection management hook with auto-reconnect
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebSocketEvent } from '../services/types';

export const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001';

interface UseWebSocketOptions {
    url?: string;
    onMessage?: (event: WebSocketEvent) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    reconnectInterval?: number;
    autoConnect?: boolean;
}

export function useWebSocket({
    url = WS_BASE_URL,
    onMessage,
    onConnect,
    onDisconnect,
    reconnectInterval = 3000,
    autoConnect = true,
}: UseWebSocketOptions = {}) {
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<WebSocketEvent[]>([]);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
    const shouldReconnect = useRef(autoConnect);

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            console.log('[WebSocket] Already connected');
            return;
        }

        console.log('[WebSocket] Connecting to', url);

        try {
            ws.current = new WebSocket(url);

            ws.current.onopen = () => {
                console.log('[WebSocket] Connected');
                setConnected(true);
                onConnect?.();
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as WebSocketEvent;
                    console.log('[WebSocket] Message received:', data.type);
                    setMessages((prev) => [data, ...prev].slice(0, 100)); // Keep last 100 messages
                    onMessage?.(data);
                } catch (error) {
                    console.error('[WebSocket] Failed to parse message:', error);
                }
            };

            ws.current.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
            };

            ws.current.onclose = () => {
                console.log('[WebSocket] Disconnected');
                setConnected(false);
                onDisconnect?.();

                // Attempt reconnection if enabled
                if (shouldReconnect.current) {
                    console.log(`[WebSocket] Reconnecting in ${reconnectInterval}ms...`);
                    reconnectTimer.current = setTimeout(() => {
                        connect();
                    }, reconnectInterval);
                }
            };
        } catch (error) {
            console.error('[WebSocket] Connection failed:', error);
            setConnected(false);
        }
    }, [url, onMessage, onConnect, onDisconnect, reconnectInterval]);

    const disconnect = useCallback(() => {
        shouldReconnect.current = false;
        if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
        }
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        setConnected(false);
    }, []);

    const send = useCallback((data: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
            console.log('[WebSocket] Message sent:', data);
        } else {
            console.warn('[WebSocket] Not connected, cannot send message');
        }
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    return {
        connected,
        messages,
        connect,
        disconnect,
        send,
        clearMessages,
    };
}

