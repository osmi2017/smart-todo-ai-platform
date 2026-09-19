import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../api/services';
import { setUnauthorizedHandler, errorMessage } from '../api/client';
import {
  getToken,
  getStoredCompany,
  getStoredUser,
  setToken,
  setStoredCompany,
  setStoredUser,
  clearAuthStorage,
} from '../storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async (notify = true) => {
    try {
      if (notify && token) {
        await authService.logout();
      }
    } catch {
      // ignorer — le serveur peut être injoignable
    }
    await clearAuthStorage();
    setTokenState(null);
    setUser(null);
    setCompany(null);
  }, [token]);

  useEffect(() => {
    setUnauthorizedHandler(() => logout(false));
  }, [logout]);

  useEffect(() => {
    let active = true;
    (async () => {
      const storedToken = await getToken();
      const storedUser = await getStoredUser();
      const storedCompany = await getStoredCompany();
      if (!active) return;
      if (storedToken && storedUser) {
        setTokenState(storedToken);
        setUser(storedUser);
        setCompany(storedCompany);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authService.login(username, password);
    if (!data.token || data.token.split('.').length !== 3) {
      throw new Error('Réponse de connexion invalide.');
    }
    await setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    setCompany(data.company || null);
    await setStoredUser(data.user);
    await setStoredCompany(data.company || null);
    return data;
  }, []);

  const register = useCallback((userData) => authService.register(userData), []);

  const value = useMemo(
    () => ({
      user,
      company,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user && !!token,
      isSuperAdmin: user?.role === 'superadmin',
      isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
      errorMessage,
    }),
    [user, company, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}