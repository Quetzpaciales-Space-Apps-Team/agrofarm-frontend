import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../features/auth/state/session';
import { Navigation } from '../app/Navigation';

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { status } = useSession();
  return (
    <>
      <a className="skip-link" href="#main">
        {t('app.shell.skipLink')}
      </a>
      <header className="app-header">
        <h1>{t('app.shell.title')}</h1>
        <p>{t('app.shell.tagline')}</p>
      </header>
      {status === 'active' ? <Navigation /> : null}
      <main id="main" className="app-main">
        {children}
      </main>
      <footer className="app-footer">
        <p>{t('app.shell.disclaimer')}</p>
      </footer>
    </>
  );
}
