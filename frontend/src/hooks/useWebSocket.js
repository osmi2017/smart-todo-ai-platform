import { useEffect, useState, useCallback, useRef } from 'react';

const WS_BASE_URL = process.env.REACT_APP_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

const MAX_RECONNECT_DELAY = 30000;

export const useWebSocket = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/notifications/${userId}/`);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setNotifications(prev => [data, ...prev]);
      };

      ws.onclose = () => {
        setIsConnected(false);
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
      clearTimeout(reconnectTimer.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [userId]);

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
