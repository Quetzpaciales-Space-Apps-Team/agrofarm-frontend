import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const links = [
  { to: '/overview', key: 'overview' },
  { to: '/farm', key: 'farm' },
  { to: '/data', key: 'data' },
  { to: '/scenario', key: 'scenario' },
  { to: '/results', key: 'results' },
  { to: '/recommendations', key: 'recommendations' },
] as const;

export function Navigation() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('navigation.label')} className="app-nav">
      <ul>
        {links.map(({ to, key }) => (
          <li key={to}>
            <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {t(`navigation.items.${key}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
