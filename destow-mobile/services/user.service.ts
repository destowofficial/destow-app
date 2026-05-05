import { apiGet, apiPut } from './api';

export interface UserProfile {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  authProvider: string;
  createdAt: string;
}

export async function getProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>('/users/me');
}

export async function updateProfile(
  name: string,
  avatarUrl?: string,
): Promise<UserProfile> {
  return apiPut<UserProfile>('/users/me', { name, avatarUrl });
}
