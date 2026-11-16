import type { Middleware } from './middleware';

export const REQUEST_ID_HEADER = 'X-Request-Id';

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Adds `X-Request-Id` so a failing call can be traced in the API logs. */
export function requestId(): Middleware {
  return (next) => (input, init) => {
    const headers = new Headers(init?.headers);
    if (!headers.has(REQUEST_ID_HEADER)) headers.set(REQUEST_ID_HEADER, newId());
    return next(input, { ...init, headers });
  };
}
