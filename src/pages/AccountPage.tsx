import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { useSession } from '../features/auth/state/session';

/** Shown to a signed-in user who has no farm yet. */
export function AccountPage() {
  const { t } = useTranslation();
  const { user, logout } = useSession();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <section aria-labelledby="account-title" className="stack">
      <div className="toolbar">
        <h2 id="account-title" ref={headingRef} tabIndex={-1}>
          {t('auth.account.title')}
        </h2>
        <button type="button" className="button button--secondary" onClick={() => void logout()}>
          {t('dashboard.logout')}
        </button>
      </div>
      {user ? <p>{t('auth.account.signedInAs', { name: user.name })}</p> : null}
      <p>{t('auth.account.noFarm')}</p>
    </section>
  );
}
