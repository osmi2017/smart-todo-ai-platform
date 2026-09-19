import { useEffect, useState, useCallback, useRef } from 'react';
import { WS_URL } from '../utils/apiConfig';

const WS_BASE_URL = WS_URL;

const MAX_RECONNECT_DELAY = 30000;

export const useWebSocket = (userId, token) => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);

  useEffect(() => {
    if (!userId || !token) return;

    let shouldReconnect = true;

    const connect = () => {
      const ws = new WebSocket(
        `${WS_BASE_URL}/ws/notifications/${userId}/`,
        ['access_token', token]
      );

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.action === 'mark_read') return;
        setNotifications(prev => [data, ...prev]);
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!shouldReconnect) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, MAX_RECONNECT_DELAY);
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };

      socketRef.current = ws;
    };

    connect();

    return () => {
      shouldReconnect = false;
      clearTimeout(reconnectTimer.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [userId, token]);

  const markAsRead = useCallback((notificationId) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        action: 'mark_read',
        notification_id: notificationId
      }));
    }
  }, []);

  return { notifications, isConnected, markAsRead };
};
