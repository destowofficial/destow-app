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
  /**
   * The code, when the server chooses to echo it back. It only does that with
   * OTP_DEV_ECHO on, which parseEnv refuses in production - so this is null in
   * any real build and there is nothing here to leak.
   */
  devCode: string | null;

  setUser: (user: AuthUser | null) => void;
  setPendingPhone: (phone: string, devCode?: string | null) => void;
  boot: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  booting: true,
  pendingPhone: '',
  devCode: null,

  setUser: (user) => set({ user }),
  setPendingPhone: (pendingPhone, devCode = null) => set({ pendingPhone, devCode }),

  boot: async () => {
    // Whatever happens, booting has to end. It gates the splash and the first
    // route, so an unhandled rejection here is not an error message - it is an
    // app that never opens, with nothing on screen to say why.
    try {
      const user = await restoreSession();
      set({ user, booting: false });
    } catch {
      set({ user: null, booting: false });
    }
  },

  signOut: async () => {
    await apiSignOut();
    set({ user: null, pendingPhone: '', devCode: null });
  },
}));
