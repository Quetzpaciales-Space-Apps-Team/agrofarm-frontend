import { useTranslation } from 'react-i18next';
import { useRoute } from '../services/navigation';

const links = [{ to: '/farm', key: 'farm' }] as const;

export function Navigation() {
  const { t } = useTranslation();
  const { path } = useRoute();
  return (
    <nav aria-label={t('navigation.label')} className="app-nav">
      <ul>
        {links.map(({ to, key }) => (
          <li key={to}>
            <a
              href={`#${to}`}
              className={path === to ? 'active' : undefined}
              aria-current={path === to ? 'page' : undefined}
            >
              {t(`navigation.items.${key}`)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
