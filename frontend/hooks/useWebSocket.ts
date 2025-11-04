/**
 * WebSocket connection management hook with auto-reconnect
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebSocketEvent } from '../services/types';

/**
 * Constructs WebSocket URL from API URL
 * Replaces http/https with ws/wss and appends /ws path
 */
function getWebSocketUrl(apiUrl: string): string {
    return apiUrl.replace(/^http/, 'ws') + '/ws';
}

interface UseWebSocketOptions {
    onMessage?: (event: WebSocketEvent) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    reconnectInterval?: number;
    autoConnect?: boolean;
}

export function useWebSocket({
    onMessage,
    onConnect,
    onDisconnect,
    reconnectInterval = 3000,
    autoConnect = true,
}: UseWebSocketOptions = {}) {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const wsUrl = getWebSocketUrl(apiUrl);
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<WebSocketEvent[]>([]);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shouldReconnect = useRef(autoConnect);

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            console.log('[WebSocket] Already connected');
            return;
        }

        console.log('[WebSocket] Connecting to', wsUrl);

        try {
            ws.current = new WebSocket(wsUrl);

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
    }, [wsUrl, onMessage, onConnect, onDisconnect, reconnectInterval]);

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

