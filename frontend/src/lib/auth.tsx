'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from './api';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER';
  companyId?: string | null;
  avatarUrl?: string | null;
  company?: {
    id: string;
    tradeName: string;
    primaryColor?: string | null;
    logoUrl?: string | null;
  } | null;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isReady: boolean;
  login: (token: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const refreshInFlight = useRef(false);

  const clearAuth = () => {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async (activeToken: string) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });
      if (response.status === 401) {
        clearAuth();
        return;
      }
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as AuthUser;
      setUser((prev) => {
        const merged: AuthUser = {
          ...(prev || data),
          ...data,
          company: data.company ?? prev?.company ?? null
        };
        window.localStorage.setItem('user', JSON.stringify(merged));
        return merged;
      });
    } finally {
      refreshInFlight.current = false;
    }
  };

  useEffect(() => {
    const storedToken = window.localStorage.getItem('token');
    const storedUser = window.localStorage.getItem('user');
    let parsedUser: AuthUser | null = null;
    if (storedUser) {
      try {
        parsedUser = JSON.parse(storedUser) as AuthUser;
        setUser(parsedUser);
      } catch {
        parsedUser = null;
      }
    }
    if (storedToken) {
      setToken(storedToken);
    }

    const bootstrap = async () => {
      if (storedToken) {
        await refreshProfile(storedToken);
      }
      setIsReady(true);
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!token) return;
    const handleFocus = () => refreshProfile(token);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token]);

  const login = (nextToken: string, nextUser: AuthUser) => {
    window.localStorage.setItem('token', nextToken);
    window.localStorage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const updateUser = (nextUser: AuthUser) => {
    window.localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = () => {
    clearAuth();
  };

  const value = useMemo(
    () => ({ token, user, isReady, login, logout, updateUser }),
    [token, user, isReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
