import { apiPost } from './api';

import axios from 'axios';
import { BASE_URL } from './api';

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
  const response = await axios.post<{ success: boolean; message: string }>(`${BASE_URL}/auth/request-otp`, { phone });
  return response.data;
}

/**
 * Verifies custom OTP token with the backend.
 * Returns our own JWT + user info.
 */
export async function verifyOtp(phone: string, code: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/verify-otp', { phone, code });
}
