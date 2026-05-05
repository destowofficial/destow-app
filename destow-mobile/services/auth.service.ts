import { apiPost } from './api';

export interface AuthUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/**
 * Verifies a Firebase ID token (from phone OTP) with the backend.
 * Returns our own JWT + user info.
 */
export async function verifyOtp(firebaseIdToken: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/verify-otp', { firebaseIdToken });
}

/**
 * Verifies a Firebase ID token (from Google Sign-In) with the backend.
 */
export async function googleSSO(firebaseIdToken: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/google-sso', { firebaseIdToken });
}
