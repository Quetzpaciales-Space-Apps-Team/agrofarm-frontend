import { useEffect } from 'react';
import { navigate } from '../services/navigation';

/** Replaces the current history entry with `to`, so the back button does not return to the redirect. */
export function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}
