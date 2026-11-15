import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { RegisterForm } from '../features/auth/components/RegisterForm';

export function RegisterPage() {
  const { t } = useTranslation();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <section aria-labelledby="register-title" className="stack auth-page">
      <h2 id="register-title" ref={headingRef} tabIndex={-1}>
        {t('auth.register.title')}
      </h2>
      <RegisterForm />
      <p className="auth-links">
        <a href="#/login">{t('auth.register.haveAccount')}</a>
        <a href="#/">{t('auth.optionalDemo')}</a>
      </p>
    </section>
  );
}
