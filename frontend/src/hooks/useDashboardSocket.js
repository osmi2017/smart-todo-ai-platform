import { useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../utils/apiConfig';

const WS_BASE_URL = WS_URL;

const MAX_RECONNECT_DELAY = 30000;

export const useDashboardSocket = (token, onRefresh) => {
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!token) return;

    const ws = new WebSocket(
      `${WS_BASE_URL}/ws/dashboard/`,
      ['access_token', token]
    );

    ws.onopen = () => {
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'dashboard_refresh') {
          onRefresh(data.reason);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, MAX_RECONNECT_DELAY);
      reconnectAttempts.current += 1;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };

    socketRef.current = ws;
  }, [token, onRefresh]);

  useEffect(() => {
    if (!token) return;
    let shouldReconnect = true;

    const safeConnect = () => {
      if (!shouldReconnect) return;
      connect();
    };

    safeConnect();

    return () => {
      shouldReconnect = false;
      clearTimeout(reconnectTimer.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [token, connect]);
};
