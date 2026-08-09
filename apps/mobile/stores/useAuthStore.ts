import { create } from 'zustand';
import type { AuthUser } from '../services/destow';
import { restoreSession, signOut as apiSignOut } from '../services/destow';

// Who is signed in, and whether we have finished asking.
//
// `booting` matters more than it looks: on a cold start the answer is not known
// until the stored refresh token has been exchanged, and routing before that
// flashes the login screen at someone who is already signed in.

interface AuthState {
  user: AuthUser | null;
  booting: boolean;
  /** Carried between the phone screen and the OTP screen. */
  pendingPhone: string;

  setUser: (user: AuthUser | null) => void;
  setPendingPhone: (phone: string) => void;
  boot: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  booting: true,
  pendingPhone: '',

  setUser: (user) => set({ user }),
  setPendingPhone: (pendingPhone) => set({ pendingPhone }),

  boot: async () => {
    const user = await restoreSession();
    set({ user, booting: false });
  },

  signOut: async () => {
    await apiSignOut();
    set({ user: null, pendingPhone: '' });
  },
}));
