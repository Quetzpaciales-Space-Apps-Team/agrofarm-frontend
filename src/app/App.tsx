import { useTranslation } from 'react-i18next';

export function App() {
  const { t } = useTranslation();

  return (
    <main>
      <h1>{t('app.shell.title')}</h1>
      <p>{t('app.shell.tagline')}</p>
      <footer>
        <small>{t('app.shell.disclaimer')}</small>
      </footer>
    </main>
  );
}
