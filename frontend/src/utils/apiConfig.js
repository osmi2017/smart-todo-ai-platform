const getHost = () =>
  typeof window !== 'undefined' && window.location && window.location.hostname
    ? window.location.hostname
    : 'localhost';

const getProtocol = () =>
  typeof window !== 'undefined' && window.location && window.location.protocol === 'https:'
    ? 'https'
    : 'http';

export const API_URL = `${getProtocol()}://${getHost()}:8000/api`;

export const WS_URL =
  `${getProtocol() === 'https' ? 'wss' : 'ws'}://${getHost()}:8000`;

export const MEETING_SERVICE_URL = `${getProtocol()}://${getHost()}:4000`;

export const ML_URL = `${getProtocol()}://${getHost()}:5001`;