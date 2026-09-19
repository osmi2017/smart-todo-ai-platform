import axios from 'axios';
import { CONFIG } from '../config';
import { getToken } from '../storage';

export const api = axios.create({
  baseURL: CONFIG.API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401 && unauthorizedHandler) {
      await unauthorizedHandler(error);
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error) {
  if (!error) return 'Une erreur est survenue.';
  if (error.response && error.response.data) {
    const d = error.response.data;
    if (typeof d === 'string') return d;
    if (d.detail) return d.detail;
    if (d.non_field_errors) return d.non_field_errors.join(', ');
    const first = Object.keys(d)[0];
    if (first) {
      const v = d[first];
      const msg = Array.isArray(v) ? v.join(', ') : v;
      return `${first}: ${msg}`;
    }
    return 'Erreur serveur.';
  }
  if (error.request) {
    return 'Impossible de joindre le serveur.';
  }
  return error.message || 'Une erreur est survenue.';
}