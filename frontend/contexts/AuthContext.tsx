import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  verify: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resendCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = api.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await api.getMe();
    if (data?.user) {
      setUser(data.user);
    } else {
      api.setToken(null);
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await api.login(email, password);
    if (error) {
      return { success: false, error };
    }
    if (data) {
      api.setToken(data.access_token);
      setUser(data.user);
      return { success: true };
    }
    return { success: false, error: 'Unknown error' };
  };

  const register = async (email: string, username: string, password: string) => {
    const { data, error } = await api.register(email, username, password);
    if (error) {
      return { success: false, error };
    }
    return { success: true };
  };

  const verify = async (email: string, code: string) => {
    const { data, error } = await api.verify(email, code);
    if (error) {
      return { success: false, error };
    }
    if (data) {
      api.setToken(data.access_token);
      setUser(data.user);
      return { success: true };
    }
    return { success: false, error: 'Unknown error' };
  };

  const resendCode = async (email: string) => {
    const { data, error } = await api.resendCode(email);
    if (error) {
      return { success: false, error };
    }
    return { success: true };
  };

  const logout = async () => {
    await api.logout();
    api.setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await api.getMe();
    if (data?.user) {
      setUser(data.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verify,
        resendCode,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
