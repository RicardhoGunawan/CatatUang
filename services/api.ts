import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL untuk API Laravel
const BASE_URL = 'https://api-catatuang-production.up.railway.app'; // Sesuaikan dengan IP Laravel server Anda

// Buat instance axios
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor untuk menambahkan token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor untuk handle error 401 (unauthorized)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired atau invalid, hapus token dan redirect ke login
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      // Anda bisa menambahkan navigation logic di sini jika diperlukan
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface RegisterResponse {
  status: string;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface ApiResponse<T> {
  status: string;
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface WalletType {
  id: number;
  user_id: number;
  name: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: number;
  user_id: number;
  user_wallet_type_id?: number;
  name: string;
  balance: number;
  created_at: string;
  updated_at: string;
  user_wallet_type?: WalletType;
}

export interface Transaction {
  id: number;
  user_id: number;
  wallet_id: number;
  category_id: number;
  amount: number;
  description?: string;
  transaction_date: string;
  type: 'income' | 'expense';
  created_at: string;
  updated_at: string;
  wallet?: Wallet;
  category?: Category;
}

export interface TransactionSummary {
  period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_income: number;
    total_expense: number;
    balance: number;
    wallet_balance: number;
  };
}

// Auth API
export const authAPI = {
  // Login menggunakan username atau email
  login: async (login: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/login', { 
      login, // Field 'login' bisa berisi email atau username
      password 
    });
    return response.data;
  },

  // Register dengan username
  register: async (
    name: string, 
    username: string, 
    email: string, 
    password: string, 
    password_confirmation: string
  ): Promise<RegisterResponse> => {
    const response = await api.post('/register', {
      name,
      username,
      email,
      password,
      password_confirmation,
    });
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response = await api.post('/logout');
    return response.data;
  },

  // Get user profile
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/profile');
    return response.data;
  },

  // Get user data (alias untuk getProfile)
  getUser: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/user');
    return response.data;
  },

  // Update profile dengan username
  updateProfile: async (data: {
    name?: string;
    username?: string;
    email?: string;
    password?: string;
    password_confirmation?: string;
  }): Promise<ApiResponse<User>> => {
    const response = await api.put('/profile', data);
    return response.data;
  },
};

// Categories API
export const categoriesAPI = {
  getAll: async (): Promise<ApiResponse<Category[]>> => {
    const response = await api.get('/categories');
    return response.data;
  },

  create: async (data: { name: string; type: 'income' | 'expense'; icon?: string }): Promise<ApiResponse<Category>> => {
    const response = await api.post('/categories', data);
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Category>> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  update: async (id: number, data: { name: string; type: 'income' | 'expense'; icon?: string }): Promise<ApiResponse<Category>> => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
};

// Wallet Types API
export const walletTypesAPI = {
  getAll: async (): Promise<ApiResponse<WalletType[]>> => {
    const response = await api.get('/wallet-types');
    return response.data;
  },

  create: async (data: { name: string; icon?: string }): Promise<ApiResponse<WalletType>> => {
    const response = await api.post('/wallet-types', data);
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<WalletType>> => {
    const response = await api.get(`/wallet-types/${id}`);
    return response.data;
  },

  update: async (id: number, data: { name: string; icon?: string }): Promise<ApiResponse<WalletType>> => {
    const response = await api.put(`/wallet-types/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/wallet-types/${id}`);
    return response.data;
  },
};

// Wallets API
export const walletsAPI = {
  getAll: async (): Promise<ApiResponse<Wallet[]>> => {
    const response = await api.get('/wallets');
    return response.data;
  },

  create: async (data: { name: string; user_wallet_type_id?: number; balance?: number }): Promise<ApiResponse<Wallet>> => {
    const response = await api.post('/wallets', data);
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Wallet>> => {
    const response = await api.get(`/wallets/${id}`);
    return response.data;
  },

  update: async (id: number, data: { name: string; user_wallet_type_id?: number; balance?: number }): Promise<ApiResponse<Wallet>> => {
    const response = await api.put(`/wallets/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/wallets/${id}`);
    return response.data;
  },
};

// Transactions API
export const transactionsAPI = {
  getAll: async (params?: {
    start_date?: string;
    end_date?: string;
    type?: 'income' | 'expense';
    wallet_id?: number;
    page?: number;
  }): Promise<ApiResponse<{
    data: Transaction[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  }>> => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  create: async (data: {
    wallet_id: number;
    category_id: number;
    amount: number;
    description?: string;
    transaction_date: string;
    type: 'income' | 'expense';
  }): Promise<ApiResponse<Transaction>> => {
    const response = await api.post('/transactions', data);
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Transaction>> => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  update: async (id: number, data: {
    wallet_id: number;
    category_id: number;
    amount: number;
    description?: string;
    transaction_date: string;
    type: 'income' | 'expense';
  }): Promise<ApiResponse<Transaction>> => {
    const response = await api.put(`/transactions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },

  getSummary: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<TransactionSummary>> => {
    const response = await api.get('/transactions-summary', { params });
    return response.data;
  },
};

export default api;