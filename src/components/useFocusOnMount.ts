import { useEffect, useRef } from 'react';

/** Moves focus to a view heading after a view switch, so keyboard and screen reader users land on it. */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
