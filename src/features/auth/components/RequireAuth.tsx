import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Redirect } from '../../../components/Redirect';
import { loginPath, useRoute } from '../../../services/navigation';
import { useSession } from '../state/session';

/**
 * Shows its children only to a signed-in user. An anonymous visitor goes to login with the current
 * path as the return path. While the session is being restored it waits instead of bouncing.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { status, restoring } = useSession();
  const { path } = useRoute();
  if (status === 'active') return <>{children}</>;
  if (restoring || status === 'starting') {
    return (
      <p role="status" className="state state--loading">
        {t('auth.restoring')}
      </p>
    );
  }
  return <Redirect to={loginPath(path)} />;
}
