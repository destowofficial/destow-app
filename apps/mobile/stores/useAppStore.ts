import { create } from 'zustand';
import { UserProfile } from '../services/types';

interface AppState {
  hasCompletedOnboarding: boolean;
  isDarkMode: boolean;
  user: UserProfile | null;

  setOnboardingComplete: () => void;
  setDarkMode: (enabled: boolean) => void;
  setUser: (user: UserProfile) => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasCompletedOnboarding: false,
  isDarkMode: false,
  user: null,

  setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),
  setDarkMode: (enabled) => set({ isDarkMode: enabled }),
  setUser: (user) => set({ user }),
}));
