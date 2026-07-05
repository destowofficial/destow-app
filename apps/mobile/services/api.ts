/**
 * Base API client for Destow backend.
 * Uses the global auth token set via setAuthToken().
 */

// Prod default = the deployed API Gateway (ap-south-1 / Mumbai).
// For local testing set EXPO_PUBLIC_API_URL in apps/mobile/.env:
//   Android emulator → http://10.0.2.2:3000/api/v1   (10.0.2.2 reaches host localhost)
//   iOS simulator    → http://localhost:3000/api/v1
//   real device      → http://<your-LAN-IP>:3000/api/v1
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://9b4zm11ds4.execute-api.ap-south-1.amazonaws.com/api/v1';

let _token: string | null = null;

/** Called by AuthContext after loading token from AsyncStorage. */
export function setAuthToken(token: string | null) {
  _token = token;
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }
  return headers;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as any)?.message ?? (data as any)?.error ?? `HTTP ${res.status}`);
  }
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}
