import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@chakra-ui/react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(JSON.parse(localStorage.getItem('company') || 'null'));
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const toast = useToast();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  // Configuration d'Axios avec le token
  const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Intercepteur pour ajouter le token aux requêtes
  axiosInstance.interceptors.request.use(
    (config) => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Intercepteur pour gérer les erreurs 401
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        logout();
      }
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axiosInstance.get('/auth/me/');
      setUser(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login/`, {
      username,
      password,
    });
    
    const { token, user } = response.data;
    
    if (!token) {
      throw new Error('Token non reçu');
    }
    
    // Vérifie que le token a le bon format (3 parties)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Format de token invalide');
    }
    
    localStorage.setItem('token', token);
    if (response.data.company) {
      localStorage.setItem('company', JSON.stringify(response.data.company));
      setCompany(response.data.company);
    }
    setToken(token);
    setUser(user);
    
    toast({
      title: 'Connexion réussie',
      description: `Bienvenue ${user.username} !`,
      status: 'success',
      duration: 3000,
    });
    
    return { success: true };
  } catch (error) {
    const message = error.response?.data?.message || 
                    error.response?.data?.non_field_errors?.[0] || 
                    'Erreur de connexion';
    
    toast({
      title: 'Erreur',
      description: message,
      status: 'error',
      duration: 3000,
    });
    
    return { success: false, error: message };
  }
};

 const register = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register/`, userData);
    
    toast({
      title: 'Inscription réussie',
      description: 'Vous pouvez maintenant vous connecter',
      status: 'success',
      duration: 3000,
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 
                    Object.values(error.response?.data || {}).flat()[0] || 
                    "Erreur d'inscription";
    
    toast({
      title: 'Erreur',
      description: message,
      status: 'error',
      duration: 3000,
    });
    
    return { success: false, error: message };
  }
};

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('company');
    setToken(null);
    setUser(null);
    setCompany(null);
    toast({
      title: 'Déconnexion',
      description: 'À bientôt !',
      status: 'info',
      duration: 3000,
    });
  };

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  const value = {
    user,
    company,
    loading,
    login,
    register,
    logout,
    axiosInstance,
    isAuthenticated: !!user,
    isSuperAdmin,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
