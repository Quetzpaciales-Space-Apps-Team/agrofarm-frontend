import { authMiddleware, type TokenStore } from './auth';
import { errorNormalizer } from './errorNormalizer';
import { compose, type Fetcher } from './middleware';
import { encodeMultipartFile } from './multipart';
import { requestId } from './requestId';
import { timeout } from './timeout';

export interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Sends one file as `multipart/form-data` instead of a JSON body. */
  upload?: { field: string; file: File };
  /** Extra request headers, for example `Idempotency-Key`. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiClient {
  get: <T>(path: string, options?: RequestOptions) => Promise<T>;
  post: <T>(path: string, options?: RequestOptions) => Promise<T>;
  put: <T>(path: string, options?: RequestOptions) => Promise<T>;
}

export interface ApiClientConfig {
  baseUrl: string;
  tokens: TokenStore;
  timeoutMs?: number;
}

/** The only place in the app that reaches `fetch`. */
const globalFetch: Fetcher = (input, init) => globalThis.fetch(input, init);

export function createApiClient({
  baseUrl,
  tokens,
  timeoutMs = 10_000,
}: ApiClientConfig): ApiClient {
  const fetcher = compose(
    requestId(),
    authMiddleware(tokens.get),
    timeout(timeoutMs),
    errorNormalizer(),
  )(globalFetch);
  const root = baseUrl.replace(/\/+$/, '');

  async function request<T>(method: string, path: string, options: RequestOptions = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) params.set(key, String(value));
    }
    const queryString = params.toString();
    const headers: Record<string, string> = {
      Accept: 'application/json, application/problem+json',
    };
    let body: BodyInit | undefined;
    if (options.upload) {
      const encoded = await encodeMultipartFile(options.upload.field, options.upload.file);
      headers['Content-Type'] = encoded.contentType;
      body = encoded.body;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
    Object.assign(headers, options.headers);

    const response = await fetcher(`${root}${path}${queryString ? `?${queryString}` : ''}`, {
      method,
      headers,
      credentials: 'include',
      signal: options.signal,
      body,
    });
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    get: (path, options) => request('GET', path, options),
    post: (path, options) => request('POST', path, options),
    put: (path, options) => request('PUT', path, options),
  };
}
