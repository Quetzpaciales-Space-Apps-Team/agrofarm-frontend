import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../features/auth/state/session';
import { Navigation } from '../app/Navigation';
import { ThemeToggle } from './ThemeToggle';

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { status, isDemoGuest, leave } = useSession();
  const isAuthenticated = status === 'active';

  return (
    <div className={`app-root ${isAuthenticated ? 'app-root--internal' : 'app-root--public'}`}>
      <a className="skip-link" href="#main">
        {t('app.shell.skipLink')}
      </a>
      <header className="app-header app-shell-header">
        <div className="app-header__branding">
          <a href="#/" className="app-header__logo-link">
            <h1>{t('app.shell.title')}</h1>
          </a>
          <p className="app-header__tagline">{t('app.shell.tagline')}</p>
        </div>
        <div className="app-header__actions">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              {isDemoGuest ? <span className="demo-badge">{t('app.shell.demo')}</span> : null}
              <button type="button" className="header-action" onClick={leave}>
                {t(isDemoGuest ? 'dashboard.leave' : 'dashboard.logout')}
              </button>
            </>
          ) : (
            <>
              <a className="header-action" href="#/login">
                {t('landing.login')}
              </a>
              <a className="header-action header-action--primary" href="#/register">
                {t('landing.register')}
              </a>
            </>
          )}
        </div>
      </header>
      <div className="app-body">
        {isAuthenticated ? <Navigation /> : null}
        <main
          id="main"
          className={`app-main app-shell-main ${isAuthenticated ? 'app-main--internal' : 'app-main--public'}`}
        >
          {children}
        </main>
      </div>
      <footer className="app-footer app-shell-footer">
        <p>{t('app.shell.disclaimer')}</p>
        <span className="app-footer__links">
          <a href="#/climate">{t('app.shell.sources')}</a>
          <a href="#/">{t('app.shell.aboutDemo')}</a>
        </span>
      </footer>
    </div>
  );
}
