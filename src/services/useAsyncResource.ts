import { useCallback, useEffect, useMemo, useState } from 'react';

export type Resource<T> =
  { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: unknown };

/**
 * Runs `load` whenever its identity changes (wrap it in `useCallback`) and exposes
 * loading, success and error states plus `reload` for a retry button.
 */
export function useAsyncResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ token: object; value: Resource<T> } | null>(null);
  // A fresh token per load/attempt: results of an older call are ignored.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const token = useMemo(() => ({}), [load, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ token, value: { status: 'success', data } });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ token, value: { status: 'error', error } });
      },
    );
    return () => controller.abort();
  }, [load, token]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const resource: Resource<T> = settled?.token === token ? settled.value : { status: 'loading' };
  return { resource, reload };
}
