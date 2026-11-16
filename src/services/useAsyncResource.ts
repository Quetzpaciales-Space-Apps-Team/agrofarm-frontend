import { useCallback, useEffect, useMemo, useState } from 'react';

export type Resource<T> =
  { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: unknown };

interface Settled<T> {
  token: object;
  value: Resource<T>;
  /** Last successful data, kept while a newer call is running. */
  lastData: T | undefined;
}

/**
 * Runs `load` whenever its identity changes (wrap it in `useCallback`) and exposes
 * loading, success and error states plus `reload` for a retry button.
 * `stale` is the last successful result, so a view can keep showing it while it updates.
 */
export function useAsyncResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  // A fresh token per load/attempt: results of an older call are ignored.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const token = useMemo(() => ({}), [load, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setSettled({ token, value: { status: 'success', data }, lastData: data });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled((previous) => ({
            token,
            value: { status: 'error', error },
            lastData: previous?.lastData,
          }));
        }
      },
    );
    return () => controller.abort();
  }, [load, token]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const resource: Resource<T> = settled?.token === token ? settled.value : { status: 'loading' };
  return { resource, reload, stale: settled?.lastData };
}
