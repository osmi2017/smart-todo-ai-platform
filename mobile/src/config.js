const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

const apiHost = (() => {
  try {
    const u = new URL(API_URL);
    return u.host;
  } catch {
    return 'localhost:8000';
  }
})();

export const CONFIG = {
  API_URL,
  WS_URL:
    process.env.EXPO_PUBLIC_WS_URL ||
    API_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, ''),
  ML_URL: process.env.EXPO_PUBLIC_ML_URL || 'http://localhost:5001',
  MEETING_SERVICE_URL:
    process.env.EXPO_PUBLIC_MEETING_SERVICE_URL || 'http://localhost:4000',
  FRONTEND_URL:
    process.env.EXPO_PUBLIC_FRONTEND_URL ||
    `http://${apiHost.replace(/:\d+$/, ':3030')}`,
};