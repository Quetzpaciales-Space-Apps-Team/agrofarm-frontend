import type { Middleware } from './middleware';

export interface TokenStore {
  get: () => string | null;
  set: (token: string) => void;
  clear: () => void;
}

/** The access token lives in this closure only: never in localStorage or sessionStorage. */
export function createTokenStore(): TokenStore {
  let token: string | null = null;
  return {
    get: () => token,
    set: (value) => {
      token = value;
    },
    clear: () => {
      token = null;
    },
  };
}

export function authMiddleware(getToken: () => string | null): Middleware {
  return (next) => (input, init) => {
    const token = getToken();
    if (!token) return next(input, init);
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return next(input, { ...init, headers });
  };
}
