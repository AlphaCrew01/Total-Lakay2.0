import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'admin' | 'delivery';
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
  loading: false,

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token, data } = response.data;

      localStorage.setItem('token', token);
      set({
        user: data.user,
        token,
        isAuthenticated: true,
        loading: false
      });
    } catch (error) {
      console.error('Login error:', error);
      set({ loading: false });
      throw error;
    }
  },

  register: async (data: any) => {
    set({ loading: true });
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, data);
      const { token, data: userData } = response.data;

      localStorage.setItem('token', token);
      set({
        user: userData.user,
        token,
        isAuthenticated: true,
        loading: false
      });
    } catch (error) {
      console.error('Register error:', error);
      set({ loading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false
    });
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    set({ loading: true });
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      set({
        user: response.data.data,
        isAuthenticated: true,
        loading: false
      });
    } catch (error) {
      console.error('Get current user error:', error);
      localStorage.removeItem('token');
      set({ loading: false });
    }
  }
}));
