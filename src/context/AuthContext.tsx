import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SessionUser, UserRole } from '../types';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (userId: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'orthonova_session_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        const parsed: SessionUser = JSON.parse(raw);
        setUser(parsed);
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (userId: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id,password,role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { ok: false as const, error: 'Login failed. Please try again.' };
      }

      if (!data) {
        return { ok: false as const, error: 'Invalid credentials.' };
      }

      if (data.password !== password) {
        return { ok: false as const, error: 'Invalid credentials.' };
      }

      const sessionUser: SessionUser = { userId: data.user_id, role: data.role as UserRole };
      setUser(sessionUser);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessionUser));
      return { ok: true as const };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.href = '/';
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}