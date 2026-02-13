import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config/api';

interface CustomerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  createdAt?: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface CustomerAuthContextType {
  user: CustomerUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Modal state
  authModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot-password' | 'verification-pending';
  openAuthModal: (mode?: 'login' | 'register' | 'forgot-password') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'register' | 'forgot-password' | 'verification-pending') => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot-password' | 'verification-pending'>('login');

  const refreshToken = useCallback(async () => {
    try {
      const storedRefreshToken = localStorage.getItem('customerRefreshToken');
      if (!storedRefreshToken) return null;

      const response = await fetch(`${API_BASE}/customer/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
        return data.accessToken;
      }
      localStorage.removeItem('customerRefreshToken');
      return null;
    } catch {
      return null;
    }
  }, []);

  const fetchUser = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/customer/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (accessToken) {
      await fetchUser(accessToken);
    }
  }, [accessToken, fetchUser]);

  useEffect(() => {
    const initAuth = async () => {
      const token = await refreshToken();
      if (token) {
        await fetchUser(token);
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshToken, fetchUser]);

  // Set up token refresh interval
  useEffect(() => {
    if (!accessToken) return;

    // Refresh token every 14 minutes (before the 15-minute expiry)
    const interval = setInterval(() => {
      refreshToken();
    }, 14 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken, refreshToken]);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/customer/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('customerRefreshToken', data.refreshToken);
    }
    setUser(data.user);
    setAuthModalOpen(false);
  };

  const loginWithGoogle = async (credential: string) => {
    const response = await fetch(`${API_BASE}/customer/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Google login failed');
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('customerRefreshToken', data.refreshToken);
    }
    setUser(data.user);
    setAuthModalOpen(false);
  };

  const register = async (data: RegisterData) => {
    const response = await fetch(`${API_BASE}/customer/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    // After registration, automatically log in
    await login(data.email, data.password);

    // Show verification pending modal
    setAuthModalMode('verification-pending');
    setAuthModalOpen(true);
  };

  const logout = async () => {
    const storedRefreshToken = localStorage.getItem('customerRefreshToken');
    try {
      await fetch(`${API_BASE}/customer/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });
    } catch {
      // Ignore errors during logout
    }

    localStorage.removeItem('customerRefreshToken');
    setAccessToken(null);
    setUser(null);
  };

  const resendVerification = async () => {
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE}/customer/resend-verification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to resend verification email');
    }
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot-password' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        isVerified: !!user?.emailVerified,
        login,
        loginWithGoogle,
        register,
        logout,
        resendVerification,
        refreshUser,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        setAuthModalMode,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
