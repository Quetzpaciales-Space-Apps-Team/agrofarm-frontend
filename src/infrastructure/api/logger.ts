import { isApiError } from './errorNormalizer';
import type { Middleware } from './middleware';
import { REQUEST_ID_HEADER } from './requestId';

export interface LoggerOptions {
  enabled?: boolean;
  sink?: (...args: unknown[]) => void;
}

const defaultSink = (...args: unknown[]) => console.debug(...args);

function pathOf(input: RequestInfo | URL): string {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  try {
    return new URL(raw, 'http://placeholder.invalid').pathname;
  } catch {
    return '(unparsable url)';
  }
}

/**
 * Development logger. It records only method, path (no query string), status, duration, request id
 * and error code. Headers, bodies and query strings can hold tokens, passwords or personal data,
 * so they are never read here.
 */
export function logger({ enabled = false, sink = defaultSink }: LoggerOptions = {}): Middleware {
  return (next) => async (input, init) => {
    if (!enabled) return next(input, init);
    const started = Date.now();
    const base = {
      method: (init?.method ?? 'GET').toUpperCase(),
      path: pathOf(input),
      requestId: new Headers(init?.headers).get(REQUEST_ID_HEADER),
    };
    try {
      const response = await next(input, init);
      sink('[api]', { ...base, status: response.status, ms: Date.now() - started });
      return response;
    } catch (error) {
      sink('[api]', {
        ...base,
        status: isApiError(error) ? error.status : 0,
        code: isApiError(error) ? error.code : 'fetch_failed',
        ms: Date.now() - started,
      });
      throw error;
    }
  };
}
