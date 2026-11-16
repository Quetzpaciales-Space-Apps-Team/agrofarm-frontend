import { isApiError } from './errorNormalizer';
import type { Middleware } from './middleware';

export interface RetryOptions {
  /** Extra attempts after the first one. */
  retries?: number;
  /** First delay in ms; it doubles on each retry. */
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const sleepFor = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

/** Only a network failure or a gateway error is worth another try: never a 4xx or a plain 500. */
const isTransient = (error: unknown) =>
  isApiError(error) && (error.code === 'network_error' || TRANSIENT_STATUSES.has(error.status));

/**
 * Retries idempotent `GET` calls with exponential backoff and a low limit.
 * Every other method is sent exactly once: replaying a write could duplicate it.
 */
export function retry({
  retries = 2,
  baseDelayMs = 250,
  sleep = sleepFor,
}: RetryOptions = {}): Middleware {
  return (next) => async (input, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method !== 'GET') return next(input, init);
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await next(input, init);
      } catch (error) {
        if (attempt >= retries || !isTransient(error) || init?.signal?.aborted) throw error;
        await sleep(baseDelayMs * 2 ** attempt);
      }
    }
  };
}
