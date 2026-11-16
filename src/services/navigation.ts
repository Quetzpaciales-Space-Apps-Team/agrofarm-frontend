import { useSyncExternalStore } from 'react';

/**
 * A tiny hash-based navigation (no router library, to keep the bundle small). The location is
 * `#/path?next=/return-path`. State lives in `window.location`, so reload and the back button work.
 */
export type AppPath =
  '/' | '/login' | '/register' | '/farm' | '/data' | '/scenarios' | '/recommendations' | '/climate';

const PATHS: readonly AppPath[] = [
  '/',
  '/login',
  '/register',
  '/farm',
  '/data',
  '/scenarios',
  '/recommendations',
  '/climate',
];
/** Paths a login may send the user back to. Never the auth pages themselves. */
const RETURN_PATHS: readonly AppPath[] = [
  '/farm',
  '/data',
  '/scenarios',
  '/recommendations',
  '/climate',
];

export interface Route {
  path: AppPath;
  /** Where to go after a successful login, or `null`. Only known app paths are accepted. */
  next: AppPath | null;
}

export function parseRoute(hash: string): Route {
  const [rawPath = '', query = ''] = hash.replace(/^#/, '').split('?');
  const path = PATHS.find((candidate) => candidate === rawPath) ?? '/';
  const rawNext = new URLSearchParams(query).get('next');
  const next = RETURN_PATHS.find((candidate) => candidate === rawNext) ?? null;
  return { path, next };
}

export const loginPath = (returnTo: AppPath) => `/login?next=${encodeURIComponent(returnTo)}`;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const readHash = () => window.location.hash.replace(/^#/, '');

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
  };
}

/** Moves to a path at once (no wait for the browser event) and updates the address bar. */
export function navigate(to: string, options: { replace?: boolean } = {}) {
  if (readHash() !== to) {
    const url = `#${to}`;
    if (options.replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  }
  emit();
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, readHash, () => '');
  return parseRoute(hash);
}
