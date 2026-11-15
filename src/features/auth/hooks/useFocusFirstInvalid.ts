import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * After a failed submit, moves focus to the first field marked `aria-invalid`.
 * Call `focusFirstInvalid()` in the same event that sets the errors: the focus moves once they render.
 */
export function useFocusFirstInvalid(formRef: RefObject<HTMLFormElement | null>) {
  const [attempt, setAttempt] = useState(0);
  const handled = useRef(0);
  useEffect(() => {
    if (attempt === handled.current) return;
    handled.current = attempt;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt, formRef]);
  return useCallback(() => setAttempt((n) => n + 1), []);
}
