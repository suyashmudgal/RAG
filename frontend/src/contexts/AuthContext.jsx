import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGetMe, apiSignIn, apiSignUp, apiSignOut, apiGoogleAuth, apiGetAuthConfig } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authConfig, setAuthConfig] = useState({ google_client_id: '', google_enabled: false });

  // Load backend public auth configuration
  useEffect(() => {
    let mounted = true;
    apiGetAuthConfig()
      .then((cfg) => {
        if (mounted) setAuthConfig(cfg);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Check current session on mount via httpOnly cookie
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGetMe();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Sign up
  const signup = async (name, email, password) => {
    const data = await apiSignUp(name, email, password);
    setUser(data.user);
    return data;
  };

  // Sign in
  const login = async (email, password) => {
    const data = await apiSignIn(email, password);
    setUser(data.user);
    return data;
  };

  // Google sign in
  const loginWithGoogle = async (credential) => {
    const data = await apiGoogleAuth(credential);
    setUser(data.user);
    return data;
  };

  // Sign out
  const logout = async () => {
    try {
      await apiSignOut();
    } catch (err) {
      console.warn('Sign out failed on server:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authConfig,
        signup,
        login,
        loginWithGoogle,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
