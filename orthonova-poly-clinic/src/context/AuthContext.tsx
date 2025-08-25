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
      console.log('Attempting login for user:', userId);
      console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
      
      const { data, error } = await supabase
        .from('users')
        .select('user_id,password,role')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        return { ok: false as const, error: `Login failed: ${error.message}` };
      }

      if (!data) {
        console.log('No user found for ID:', userId);
        return { ok: false as const, error: 'Invalid credentials.' };
      }

      if (data.password !== password) {
        console.log('Password mismatch for user:', userId);
        return { ok: false as const, error: 'Invalid credentials.' };
      }

      console.log('Login successful for user:', userId, 'with role:', data.role);
      const sessionUser: SessionUser = { userId: data.user_id, role: data.role as UserRole };
      setUser(sessionUser);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessionUser));
      return { ok: true as const };
    } catch (err) {
      console.error('Login exception:', err);
      return { ok: false as const, error: 'Login failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}