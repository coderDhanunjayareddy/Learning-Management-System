/* eslint-disable react-refresh/only-export-components */
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { applyToken } from '../services/api';

type Role =
  | 'super_admin'
  | 'content_authorizer'
  | 'client_admin'
  | 'school_owner'
  | 'teacher'
  | 'student';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active?: boolean;
  client_id?: number | null;
  user_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const nextToken = (event as CustomEvent<string | null>).detail ?? null;
      setToken((prev) => (prev === nextToken ? prev : nextToken));
    };
    window.addEventListener('auth-token', handler as EventListener);
    return () => window.removeEventListener('auth-token', handler as EventListener);
  }, []);

  const syncAuthCookie = useCallback((nextToken: string | null) => {
    const maxAge = nextToken ? 60 * 60 * 24 * 7 : 0; // 7 days
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    const sameSite = import.meta.env.VITE_AUTH_COOKIE_SAMESITE || 'Lax';
    const cookieDomain = import.meta.env.VITE_AUTH_COOKIE_DOMAIN
      ? `; Domain=${import.meta.env.VITE_AUTH_COOKIE_DOMAIN}`
      : '';
    document.cookie = `token=${nextToken || ''}; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}${cookieDomain}`;
  }, []);

  useEffect(() => {
    applyToken(token);
    syncAuthCookie(token);
  }, [token, syncAuthCookie]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // ignore logout errors, clear local state anyway
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      syncAuthCookie(null);
    }
  }, [syncAuthCookie]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return setLoading(false);
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch (error) {
        console.error('Failed to load user:', error);
        await logout();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token, logout]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });

    const { token, user } = res.data;

    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
