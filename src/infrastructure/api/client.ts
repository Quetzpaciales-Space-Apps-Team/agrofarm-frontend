import { authMiddleware, type TokenStore } from './auth';
import { errorNormalizer, isApiError } from './errorNormalizer';
import { locale } from './locale';
import { logger, type LoggerOptions } from './logger';
import { compose, type Fetcher } from './middleware';
import { refreshOn401, singleFlight } from './refreshOn401';
import { requestId } from './requestId';
import { retry } from './retry';
import { timeout } from './timeout';

export interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

export interface ApiClient {
  get: <T>(path: string, options?: RequestOptions) => Promise<T>;
  post: <T>(path: string, options?: RequestOptions) => Promise<T>;
  put: <T>(path: string, options?: RequestOptions) => Promise<T>;
  /**
   * Asks `POST /v1/auth/refresh` for a new access token using the httpOnly refresh cookie.
   * Resolves `null` when there is no valid cookie. It does not touch the token store: the caller
   * decides whether the answer is still wanted (session restore on app start).
   * Concurrent calls, including the automatic ones after a 401, share one request.
   */
  refresh: () => Promise<string | null>;
  /** Called when an authenticated request got a 401 that could not be refreshed. Returns an unsubscribe. */
  onSessionExpired: (handler: () => void) => () => void;
}

interface TokenResponse {
  access_token: string;
}

export interface ApiClientConfig {
  baseUrl: string;
  tokens: TokenStore;
  timeoutMs?: number;
  /** Current UI language for `Accept-Language`. */
  getLocale?: () => string;
  /** Delay before the first retry of a GET, in ms. */
  retryDelayMs?: number;
  /** Development logging. Off unless enabled. */
  log?: LoggerOptions;
}

/** The only place in the app that reaches `fetch`. */
const globalFetch: Fetcher = (input, init) => globalThis.fetch(input, init);

export function createApiClient({
  baseUrl,
  tokens,
  timeoutMs = 10_000,
  getLocale = () => 'en',
  retryDelayMs,
  log,
}: ApiClientConfig): ApiClient {
  const expiredHandlers = new Set<() => void>();
  const refreshOnce: () => Promise<string | null> = singleFlight(async () => {
    try {
      const { access_token } = await request<TokenResponse>('POST', '/v1/auth/refresh');
      return access_token;
    } catch (error) {
      if (!isApiError(error) || error.status !== 401) throw error;
      return null;
    }
  });
  // Order matters (AGENTS.md 3.1): requestId, locale, auth, timeout, retry, refreshOn401,
  // errorNormalizer, logger.
  const fetcher = compose(
    requestId(),
    locale(getLocale),
    authMiddleware(tokens.get),
    timeout(timeoutMs),
    retry({ baseDelayMs: retryDelayMs }),
    refreshOn401({
      getToken: tokens.get,
      refresh: async () => {
        const token = await refreshOnce();
        if (token) {
          tokens.set(token);
        } else {
          tokens.clear();
          expiredHandlers.forEach((handler) => handler());
        }
        return token;
      },
    }),
    errorNormalizer(),
    logger(log),
  )(globalFetch);
  const root = baseUrl.replace(/\/+$/, '');

  async function request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) params.set(key, String(value));
    }
    const queryString = params.toString();
    const headers: Record<string, string> = {
      Accept: 'application/json, application/problem+json',
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetcher(`${root}${path}${queryString ? `?${queryString}` : ''}`, {
      method,
      headers,
      credentials: 'include',
      signal: options.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    get: (path, options) => request('GET', path, options),
    post: (path, options) => request('POST', path, options),
    put: (path, options) => request('PUT', path, options),
    refresh: refreshOnce,
    onSessionExpired: (handler) => {
      expiredHandlers.add(handler);
      return () => expiredHandlers.delete(handler);
    },
  };
}
