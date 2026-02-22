'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

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
  login: (token: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem('token');
    const storedUser = window.localStorage.getItem('user');
    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

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
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ token, user, login, logout, updateUser }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
