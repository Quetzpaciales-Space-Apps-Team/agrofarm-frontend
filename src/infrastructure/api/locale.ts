import type { Middleware } from './middleware';

/** Adds `Accept-Language` so the API can answer in the user's language. A caller-set header wins. */
export function locale(getLocale: () => string): Middleware {
  return (next) => (input, init) => {
    const headers = new Headers(init?.headers);
    if (!headers.has('Accept-Language')) headers.set('Accept-Language', getLocale());
    return next(input, { ...init, headers });
  };
}
