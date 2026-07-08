import { create } from 'zustand';
import { AuthUser } from '../services/types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingPhone: string;
  pendingOtp: string;

  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  setPendingPhone: (phone: string) => void;
  setPendingOtp: (otp: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  pendingPhone: '',
  pendingOtp: '',

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  setPendingPhone: (phone) => set({ pendingPhone: phone }),
  setPendingOtp: (otp) => set({ pendingOtp: otp }),
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      pendingPhone: '',
      pendingOtp: '',
    }),
}));
