import { config } from '../constants/config';
import {
  getAccessToken,
  getRefreshToken,
  saveSession,
  setAccessToken,
  clearSession,
} from './session';

// The one place the app talks to the API.
//
// Every response comes back in the same envelope, so unwrapping it once here
// means no screen ever handles `{ success: false }` by hand:
//   { success: true,  data: ... }
//   { success: false, error: string, code: string, details?: ... }

export interface ApiErrorShape {
  error: string;
  code: string;
  details?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
  /** The same text as `message`, named as it is on the wire so screens read
   *  like the envelope they came from. */
  readonly error: string;

  constructor(status: number, body: ApiErrorShape) {
    super(body.error);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.error = body.error;
  }

  /** The first message for a field, for putting an error under an input. */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0];
  }
}

// A dropped connection is not a server error and must not read like one. Screens
// check for this to offer "try again" rather than showing a backend message.
export class NetworkError extends Error {
  constructor() {
    super('No connection');
    this.name = 'NetworkError';
  }
}

const TIMEOUT_MS = 15_000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip the Authorization header. Used by the auth endpoints themselves. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

async function raw(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (!opts.anonymous) {
    const token = getAccessToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }

  // AbortSignal.timeout is not in every RN runtime yet, so this is done by hand.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);

  try {
    return await fetch(`${config.apiUrl}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

// Only ever one refresh in flight. Without this, a screen that fires three
// requests on mount would send three refreshes on a cold start - and since
// refresh tokens rotate, two of them would be reuse and the server would revoke
// the whole session for what is really one expired token.
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;

      const res = await raw('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        anonymous: true,
      });
      if (!res.ok) {
        // The token is spent, reused or revoked. Nothing to retry with.
        await clearSession();
        return false;
      }
      const json = (await res.json()) as {
        data: { accessToken: string; refreshToken: string };
      };
      await saveSession(json.data);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(res.status, {
      error: 'Something went wrong',
      code: 'malformed_response',
    });
  }

  if (!res.ok) {
    const e = body as Partial<ApiErrorShape>;
    throw new ApiError(res.status, {
      error: e.error ?? 'Something went wrong',
      code: e.code ?? 'unknown',
      details: e.details,
    });
  }
  return (body as { data: T }).data;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await raw(path, opts);

  // One refresh, one retry. A 401 on the retry is a genuinely dead session.
  if (res.status === 401 && !opts.anonymous) {
    const ok = await refreshSession();
    if (!ok) {
      await clearSession();
      throw new ApiError(401, { error: 'Please sign in again', code: 'unauthorized' });
    }
    res = await raw(path, opts);
  }

  return parse<T>(res);
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
