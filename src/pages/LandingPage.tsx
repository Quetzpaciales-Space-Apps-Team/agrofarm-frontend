import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { useSession } from '../features/auth/state/session';

export function LandingPage() {
  const { t } = useTranslation();
  const { status, errorKey, startDemo } = useSession();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const starting = status === 'starting';

  return (
    <div className="landing-container">
      <section aria-labelledby="landing-title" className="landing-hero-grid">
        <div className="landing-hero-content">
          <span className="landing-preview-badge">{t('landing.eyebrow')}</span>
          <h2 id="landing-title" ref={headingRef} tabIndex={-1}>
            {t('landing.title')}
          </h2>
          <p className="landing-intro">{t('landing.intro')}</p>
          <div className="landing-actions">
            <button
              type="button"
              className="button button--primary landing-primary-btn"
              disabled={starting}
              aria-busy={starting}
              onClick={() => {
                try {
                  sessionStorage.setItem('agrofarm_auto_tour', 'true');
                } catch {
                  // ignore in private browsing
                }
                void startDemo();
              }}
            >
              {starting ? t('landing.starting') : t('landing.tryDemo')}
            </button>
            <p className="landing-demo-note">{t('landing.demoNote')}</p>
          </div>
          {status === 'error' && errorKey ? (
            <p role="alert" className="state state--error">
              {t(errorKey)}
            </p>
          ) : null}
          <p className="auth-links landing-auth-links">
            <span>{t('landing.accountNote')}</span>
            <a href="#/login">{t('landing.login')}</a>
            <a href="#/register">{t('landing.register')}</a>
          </p>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <div className="landing-preview-card">
            <span className="landing-preview-badge">{t('landing.badge')}</span>
            {/* Tree and crop agricultural illustration */}
            <svg
              className="landing-illustration"
              viewBox="0 0 420 280"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="420" height="280" rx="12" fill="#F4F7F1" />
              {/* Sun & warm sky */}
              <circle cx="340" cy="70" r="36" fill="#E8BF58" fillOpacity="0.85" />
              <circle cx="340" cy="70" r="48" fill="#E8BF58" fillOpacity="0.2" />

              {/* Rolling hills */}
              <path
                d="M0 180 Q100 125 210 155 T420 135 L420 280 L0 280 Z"
                fill="#DCE9BD"
                fillOpacity="0.75"
              />
              <path
                d="M0 205 Q120 160 250 190 T420 175 L420 280 L0 280 Z"
                fill="#82AA8D"
                fillOpacity="0.6"
              />
              <path d="M0 230 Q160 205 300 225 T420 220 L420 280 L0 280 Z" fill="#285C44" />

              {/* Tree 1: lush canopy */}
              <g transform="translate(60, 95)">
                {/* Trunk & branches */}
                <path
                  d="M40 90 L40 45 Q40 35 32 25 L40 45 Q40 35 48 25"
                  stroke="#5C3D2E"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M40 90 Q30 110 20 115 M40 90 Q50 110 60 115"
                  stroke="#5C3D2E"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                {/* Leaves */}
                <circle cx="40" cy="30" r="28" fill="#1D4A36" />
                <circle cx="22" cy="38" r="20" fill="#285C44" />
                <circle cx="58" cy="38" r="20" fill="#3D7E5D" />
                <circle cx="40" cy="18" r="20" fill="#4B9B73" />
                <circle cx="32" cy="24" r="12" fill="#DCE9BD" fillOpacity="0.5" />
              </g>

              {/* Tree 2: medium tree */}
              <g transform="translate(145, 120)">
                <path
                  d="M30 75 L30 35 Q30 25 22 18 M30 35 Q30 25 38 18"
                  stroke="#5C3D2E"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle cx="30" cy="24" r="22" fill="#183D30" />
                <circle cx="16" cy="30" r="16" fill="#285C44" />
                <circle cx="44" cy="30" r="16" fill="#3D7E5D" />
                <circle cx="30" cy="14" r="15" fill="#5AA880" />
              </g>

              {/* Tree 3: background fruit tree */}
              <g transform="translate(240, 135)">
                <path d="M25 60 L25 30" stroke="#5C3D2E" strokeWidth="4" strokeLinecap="round" />
                <circle cx="25" cy="20" r="18" fill="#285C44" />
                <circle cx="14" cy="24" r="12" fill="#3D7E5D" />
                <circle cx="36" cy="24" r="12" fill="#4B9B73" />
                {/* Fruit accents */}
                <circle cx="20" cy="18" r="2.5" fill="#E8BF58" />
                <circle cx="28" cy="23" r="2.5" fill="#E8BF58" />
                <circle cx="32" cy="16" r="2.5" fill="#E8BF58" />
              </g>

              {/* Crop rows and foliage in foreground */}
              <line
                x1="80"
                y1="230"
                x2="40"
                y2="280"
                stroke="#FFFEFA"
                strokeWidth="2"
                strokeDasharray="5 5"
                strokeOpacity="0.5"
              />
              <line
                x1="180"
                y1="228"
                x2="160"
                y2="280"
                stroke="#FFFEFA"
                strokeWidth="2"
                strokeDasharray="5 5"
                strokeOpacity="0.5"
              />
              <line
                x1="280"
                y1="226"
                x2="290"
                y2="280"
                stroke="#FFFEFA"
                strokeWidth="2"
                strokeDasharray="5 5"
                strokeOpacity="0.5"
              />
              <line
                x1="370"
                y1="225"
                x2="395"
                y2="280"
                stroke="#FFFEFA"
                strokeWidth="2"
                strokeDasharray="5 5"
                strokeOpacity="0.5"
              />

              {/* Floating metrics badge mock */}
              <g filter="drop-shadow(0px 4px 10px rgba(24, 61, 48, 0.18))">
                <rect
                  x="230"
                  y="35"
                  width="165"
                  height="65"
                  rx="10"
                  fill="#FFFEFA"
                  stroke="#DCE2D5"
                  strokeWidth="1.5"
                />
                <circle cx="254" cy="67" r="14" fill="#E8EEDF" />
                <path
                  d="M250 67 L253 70 L259 64"
                  stroke="#285C44"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect x="278" y="52" width="70" height="9" rx="4.5" fill="#20382C" />
                <rect x="278" y="68" width="100" height="7" rx="3.5" fill="#7FA98B" />
                <rect x="278" y="80" width="55" height="6" rx="3" fill="#DCE9BD" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* Benefits grid with the 3 cards below */}
      <section className="landing-benefits-grid" aria-label={t('navigation.label')}>
        <div className="benefit-card">
          <h3 className="benefit-title">{t('landing.benefits.evidence.title')}</h3>
          <p className="benefit-desc">{t('landing.benefits.evidence.description')}</p>
        </div>

        <div className="benefit-card">
          <h3 className="benefit-title">{t('landing.benefits.uncertainty.title')}</h3>
          <p className="benefit-desc">{t('landing.benefits.uncertainty.description')}</p>
        </div>

        <div className="benefit-card">
          <h3 className="benefit-title">{t('landing.benefits.support.title')}</h3>
          <p className="benefit-desc">{t('landing.benefits.support.description')}</p>
        </div>
      </section>
    </div>
  );
}
