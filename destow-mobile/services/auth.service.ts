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
 * Requests an OTP from the backend.
 */
export async function requestOtp(phone: string): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>('/auth/request-otp', { phone });
}

/**
 * Verifies custom OTP token with the backend.
 * Returns our own JWT + user info.
 */
export async function verifyOtp(phone: string, code: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/verify-otp', { phone, code });
}
