import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, NetworkError } from '../services/http';

// Load-once-and-refresh, which is what nearly every screen here needs.
//
// Errors are turned into a sentence a customer can act on: a dropped connection
// says so and offers a retry, a server refusal says what the server said, and
// anything else is generic rather than leaking an internal message.
export function messageFor(e: unknown): string {
  if (e instanceof NetworkError) return 'No connection. Check your network and try again.';
  if (e instanceof ApiError) return e.error;
  return 'Something went wrong. Try again.';
}

export interface Async<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  // A screen that unmounts mid-flight must not set state afterwards.
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => {
        if (!cancelled && alive.current) setData(d);
      })
      .catch((e) => {
        if (!cancelled && alive.current) setError(messageFor(e));
      })
      .finally(() => {
        if (!cancelled && alive.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}
