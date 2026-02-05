import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import { wsService } from '../services/websocket';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const { user } = await authApi.getMe();
          setUser(user);
          wsService.connect(user.id);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
    wsService.connect(response.user.id);
  };

  const register = async (username: string, password: string) => {
    const response = await authApi.register(username, password);
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
    wsService.connect(response.user.id);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    wsService.disconnect();
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const { user } = await authApi.getMe();
        setUser(user);
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
