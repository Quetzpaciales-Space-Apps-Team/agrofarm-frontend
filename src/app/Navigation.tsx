import { useTranslation } from 'react-i18next';
import { useRoute } from '../services/navigation';

interface NavItem {
  to: string;
  key: string;
  icon: 'farm' | 'data' | 'scenarios' | 'recommendations' | 'climate';
}

const links: readonly NavItem[] = [
  { to: '/farm', key: 'overview', icon: 'farm' },
  { to: '/data', key: 'data', icon: 'data' },
  { to: '/scenarios', key: 'scenarios', icon: 'scenarios' },
  { to: '/recommendations', key: 'recommendations', icon: 'recommendations' },
  { to: '/climate', key: 'climate', icon: 'climate' },
] as const;

function NavIcon({ icon }: { icon: NavItem['icon'] }) {
  switch (icon) {
    case 'farm':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'data':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );
    case 'scenarios':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );
    case 'recommendations':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'climate':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </svg>
      );
  }
}

export function Navigation() {
  const { t } = useTranslation();
  const { path } = useRoute();
  return (
    <nav aria-label={t('navigation.label')} className="app-nav app-sidebar">
      <ul>
        {links.map(({ to, key, icon }, index) => {
          const isActive = path === to;
          return (
            <li key={to}>
              <a
                href={`#${to}`}
                className={isActive ? 'active' : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="app-nav__num" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="app-nav__icon">
                  <NavIcon icon={icon} />
                </span>
                <span className="app-nav__label">{t(`navigation.items.${key}`)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
