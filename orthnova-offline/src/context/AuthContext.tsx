import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
// Note: We're not importing supabase anymore since we're using localStorage directly
import { SessionUser, UserRole } from '../types';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (userId: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'orthonova_session_user_v1';
const USERS_STORAGE_KEY = 'orthnova_data';

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
      // Get users from localStorage
      const data = localStorage.getItem(USERS_STORAGE_KEY);
      const appData = data ? JSON.parse(data) : { users: [] };
      
      // Find user in the stored data
      const userData = appData.users.find((u: any) => u.user_id === userId);
      
      if (!userData) {
        return { ok: false as const, error: 'Invalid credentials.' };
      }
      
      if (userData.password !== password) {
        return { ok: false as const, error: 'Invalid credentials.' };
      }
      
      const sessionUser: SessionUser = { userId: userData.user_id, role: userData.role as UserRole };
      setUser(sessionUser);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessionUser));
      return { ok: true as const };
    } catch (error) {
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