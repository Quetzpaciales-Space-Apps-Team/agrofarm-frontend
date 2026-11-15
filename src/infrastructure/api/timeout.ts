import type { Middleware } from './middleware';

/** Aborts the call after `ms` milliseconds with a `TimeoutError` as the abort reason. */
export function timeout(ms: number): Middleware {
  return (next) => (input, init) => {
    const controller = new AbortController();
    const caller = init?.signal ?? undefined;
    const forward = () => controller.abort(caller?.reason);
    if (caller?.aborted) forward();
    else caller?.addEventListener('abort', forward, { once: true });

    const timer = setTimeout(
      () => controller.abort(new DOMException('The request timed out.', 'TimeoutError')),
      ms,
    );
    return next(input, { ...init, signal: controller.signal }).finally(() => {
      clearTimeout(timer);
      caller?.removeEventListener('abort', forward);
    });
  };
}
