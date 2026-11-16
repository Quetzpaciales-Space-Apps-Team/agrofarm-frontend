import { isApiError } from './errorNormalizer';
import type { Middleware } from './middleware';

export interface RefreshOptions {
  getToken: () => string | null;
  /** Gets a new access token from the refresh cookie, or `null` when the session is over. */
  refresh: () => Promise<string | null>;
}

/** The auth endpoints answer 401 for their own reasons (wrong password, no cookie): never refresh for them. */
const isAuthEndpoint = (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return /\/v1\/auth\//.test(url);
};

/** Shares one running call between concurrent callers (single flight). */
export function singleFlight<T>(task: () => Promise<T>): () => Promise<T> {
  let running: Promise<T> | null = null;
  return () => {
    running ??= task().finally(() => {
      running = null;
    });
    return running;
  };
}

/**
 * On a 401 it refreshes the session once, shared by all concurrent requests, and replays the
 * failed request once with the new token. A request that fails again is not refreshed again.
 */
export function refreshOn401({ getToken, refresh }: RefreshOptions): Middleware {
  const refreshOnce = singleFlight(refresh);
  return (next) => async (input, init) => {
    try {
      return await next(input, init);
    } catch (error) {
      if (!isApiError(error) || error.status !== 401 || isAuthEndpoint(input)) throw error;
      const sent = new Headers(init?.headers).get('Authorization');
      const current = getToken();
      let token = current;
      // Another request may have renewed the token while this one was in flight.
      if (!current || sent === `Bearer ${current}`) {
        try {
          token = await refreshOnce();
        } catch {
          throw error;
        }
      }
      if (!token) throw error;
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return next(input, { ...init, headers });
    }
  };
}
