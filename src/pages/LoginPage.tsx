import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { LoginForm } from '../features/auth/components/LoginForm';

export function LoginPage() {
  const { t } = useTranslation();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <section aria-labelledby="login-title" className="stack auth-page">
      <h2 id="login-title" ref={headingRef} tabIndex={-1}>
        {t('auth.login.title')}
      </h2>
      <LoginForm />
      <p className="auth-links">
        <a href="#/register">{t('auth.login.noAccount')}</a>
        <a href="#/">{t('auth.optionalDemo')}</a>
      </p>
    </section>
  );
}
