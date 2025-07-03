import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (login: string, password: string) => Promise<void>; // login bisa email atau username
  register: (name: string, username: string, email: string, password: string, password_confirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!(user && token);

  // Load user data from AsyncStorage saat app start
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const savedToken = await AsyncStorage.getItem('auth_token');
      const savedUser = await AsyncStorage.getItem('user_data');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        
        // Verify token masih valid dengan hit API profile
        try {
          const response = await authAPI.getProfile();
          if (response.status === 'success' && response.data) {
            setUser(response.data);
            await AsyncStorage.setItem('user_data', JSON.stringify(response.data));
          }
        } catch (error) {
          // Token invalid, clear data
          await clearAuthData();
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthData = async (token: string, user: User) => {
    try {
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      setToken(token);
      setUser(user);
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw new Error('Failed to save authentication data');
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const login = async (login: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(login, password);
      
      if (response.status === 'success' && response.data) {
        await saveAuthData(response.data.token, response.data.user);
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      // console.error('Login error:', error);
      
      // Handle different error types
      if (error.response?.status === 401) {
        throw new Error('Username/Email atau password salah');
      } else if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        if (errors) {
          const errorMessages = Object.values(errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        throw new Error('Data tidak valid');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Login gagal. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, username: string, email: string, password: string, password_confirmation: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(name, username, email, password, password_confirmation);
      
      if (response.status === 'success' && response.data) {
        await saveAuthData(response.data.token, response.data.user);
      } else {
        throw new Error('Registration failed');
      }
    } catch (error: any) {
      console.error('Register error:', error);
      
      // Handle different error types
      if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        if (errors) {
          const errorMessages = Object.values(errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        throw new Error('Data tidak valid');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Registrasi gagal. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Call logout API jika token masih ada
      if (token) {
        try {
          await authAPI.logout();
        } catch (error) {
          console.warn('Logout API call failed:', error);
          // Continue with local logout even if API fails
        }
      }
      
      await clearAuthData();
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear local data even if there's an error
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      if (!token) return;
      
      const response = await authAPI.getProfile();
      if (response.status === 'success' && response.data) {
        setUser(response.data);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data));
      } else {
        await clearAuthData();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await clearAuthData();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};