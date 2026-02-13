// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

type Role =
  | 'super_admin'
  | 'content_authorizer'
  | 'client_admin'
  | 'school_owner'
  | 'teacher'
  | 'student';

const apiaxis = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}` || 'https://localhost:5000',
});

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
  register: (
    email: string,
    full_name: string,
    password: string,
    role: Role,
    client_id?: number | null,
    user_id?: string | null
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      apiaxis.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiaxis.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return setLoading(false);
      try {
        const res = await apiaxis.get('/api/auth/me');
        setUser(res.data.user);
      } catch (error) {
        console.error('Failed to load user:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await apiaxis.post('/api/auth/login', { email, password });

    const { token, user } = res.data;

    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  };

  const register = async (
    email: string,
    full_name: string,
    password: string,
    role: Role,
    client_id?: number | null,
    user_id?: string | null
  ) => {
    const res = await apiaxis.post('/api/auth/register', {
      email,
      full_name,
      password,
      role,
      client_id,
      user_id,
    });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
