import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

/**
 * Provides authentication state and helpers to the whole app.
 *
 * State:
 *   user       – null (unknown / logged out) or the session user object
 *   loading    – true while the initial session check is in flight
 *
 * Methods exposed via context:
 *   login(username, password) → { ok, ...rest }
 *   logout()
 *   register({ firstname, lastname, email, password }) → { ok, ...rest }
 *   refreshUser()  – re-fetch /auth/me
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check session on mount
  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      if (res.ok && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login
  const login = async (username, password) => {
    const res = await authApi.login(username, password);
    if (res.ok && res.success) {
      // Refresh session user from server after login
      await refreshUser();
      navigate('/home');
    }
    return res;
  };

  // Logout
  const logout = async () => {
    await authApi.logout();
    setUser(null);
    navigate('/login');
  };

  // Register (public)
  const register = async (formData) => {
    return authApi.register(formData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to consume auth context.
 * @returns {{ user, loading, login, logout, register, refreshUser }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
