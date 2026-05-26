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
  const result = await apiGet<{ user: UserProfile }>('/users/me');
  return result.user;
}

export async function updateProfile(
  name: string,
  avatarUrl?: string,
): Promise<UserProfile> {
  const result = await apiPut<{ user: UserProfile }>('/users/me', { name, avatarUrl });
  return result.user;
}
