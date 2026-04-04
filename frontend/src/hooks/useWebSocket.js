import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useWebSocket = (userId) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/notifications/${userId}/`);
    
    ws.onopen = () => {
      console.log('WebSocket connecté');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setNotifications(prev => [data, ...prev]);
    };

    ws.onclose = () => {
      console.log('WebSocket déconnecté');
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [userId]);

  const markAsRead = useCallback((notificationId) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'mark_read',
        notification_id: notificationId
      }));
    }
  }, [socket]);

  return { notifications, isConnected, markAsRead };
};
