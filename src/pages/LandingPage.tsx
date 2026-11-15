import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { useSession } from '../features/auth/state/session';

export function LandingPage() {
  const { t } = useTranslation();
  const { status, errorKey, startDemo } = useSession();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const starting = status === 'starting';

  return (
    <section aria-labelledby="landing-title" className="hero">
      <h2 id="landing-title" ref={headingRef} tabIndex={-1}>
        {t('landing.title')}
      </h2>
      <p>{t('landing.intro')}</p>
      <p>{t('landing.demoNote')}</p>
      <button
        type="button"
        className="button"
        disabled={starting}
        aria-busy={starting}
        onClick={() => void startDemo()}
      >
        {starting ? t('landing.starting') : t('landing.tryDemo')}
      </button>
      {status === 'error' && errorKey ? (
        <p role="alert" className="state state--error">
          {t(errorKey)}
        </p>
      ) : null}
      <p className="auth-links">
        <span>{t('landing.accountNote')}</span>
        <a href="#/login">{t('landing.login')}</a>
        <a href="#/register">{t('landing.register')}</a>
      </p>
    </section>
  );
}
