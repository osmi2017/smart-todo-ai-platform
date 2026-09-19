import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'smarttodoai_token';
const USER_KEY = 'smarttodoai_user';
const COMPANY_KEY = 'smarttodoai_company';

const MEMO = {};

const isWeb = Platform.OS === 'web';

async function get(key) {
  if (isWeb) return MEMO[key] ?? null;
  return SecureStore.getItemAsync(key);
}

async function set(key, value) {
  if (isWeb) {
    MEMO[key] = value;
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function del(key) {
  if (isWeb) {
    delete MEMO[key];
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getToken() {
  return get(TOKEN_KEY);
}

export async function setToken(token) {
  await set(TOKEN_KEY, token);
}

export async function getStoredUser() {
  const raw = await get(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user) {
  await set(USER_KEY, JSON.stringify(user));
}

export async function getStoredCompany() {
  const raw = await get(COMPANY_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredCompany(company) {
  await set(COMPANY_KEY, JSON.stringify(company));
}

export async function clearAuthStorage() {
  await Promise.all([del(TOKEN_KEY), del(USER_KEY), del(COMPANY_KEY)]);
}