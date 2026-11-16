import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { useSession } from '../features/auth/state/session';

const STALKS = [
  { x: 70, height: 120, delay: 0.1 },
  { x: 140, height: 150, delay: 0.5 },
  { x: 210, height: 135, delay: 0.9 },
  { x: 280, height: 160, delay: 0.3 },
  { x: 350, height: 128, delay: 0.7 },
] as const;

const DROPS = [60, 120, 190, 250, 320, 380] as const;

/** One maize plant: stem, leaves and a cob. It grows from the soil line (see `.stalk`). */
function MaizeStalk({ x, height, delay }: { x: number; height: number; delay: number }) {
  const top = 300 - height;
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="stalk" style={{ animationDelay: `${delay}s` }}>
        <path d={`M0 300 L0 ${top}`} className="stalk__stem" />
        <path d={`M0 ${top + 28} Q-34 ${top + 4} -44 ${top + 30}`} className="stalk__leaf" />
        <path d={`M0 ${top + 52} Q34 ${top + 28} 46 ${top + 56}`} className="stalk__leaf" />
        <path d={`M0 ${top + 80} Q-38 ${top + 58} -48 ${top + 88}`} className="stalk__leaf" />
        <ellipse cx="9" cy={top + 62} rx="6" ry="16" className="stalk__cob" />
        <path
          d={`M0 ${top} Q-6 ${top - 16} 0 ${top - 24} Q6 ${top - 16} 0 ${top}`}
          className="stalk__tassel"
        />
      </g>
    </g>
  );
}

function CropScene({ label }: { label: string }) {
  return (
    <svg
      className="crop-scene"
      viewBox="0 0 440 340"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="372" cy="62" r="54" className="crop-scene__halo" />
      <circle cx="372" cy="62" r="30" className="crop-scene__sun" />
      {DROPS.map((x, index) => (
        <line
          key={x}
          x1={x}
          y1="20"
          x2={x - 6}
          y2="44"
          className="crop-scene__drop"
          style={{ animationDelay: `${index * 0.35}s` }}
        />
      ))}
      <path d="M0 292 Q110 262 220 280 T440 270 L440 340 L0 340 Z" className="crop-scene__hill" />
      <rect y="298" width="440" height="42" className="crop-scene__soil" />
      {[0, 1, 2, 3].map((row) => (
        <line
          key={row}
          x1="0"
          y1={312 + row * 9}
          x2="440"
          y2={312 + row * 9}
          className="crop-scene__furrow"
        />
      ))}
      {STALKS.map((stalk) => (
        <MaizeStalk key={stalk.x} {...stalk} />
      ))}
      {/* A cacao branch with two pods, swaying slowly, in the corner. */}
      <g className="cacao" transform="translate(400 150)">
        <path d="M30 -30 Q0 -20 -30 8" className="cacao__branch" />
        <g className="cacao__pod" transform="translate(-6 -10)">
          <path d="M0 0 L0 8" className="cacao__stem" />
          <ellipse cx="0" cy="28" rx="11" ry="22" className="cacao__fruit" />
          <path d="M0 8 L0 48" className="cacao__rib" />
        </g>
        <g className="cacao__pod cacao__pod--late" transform="translate(-24 0)">
          <path d="M0 0 L0 8" className="cacao__stem" />
          <ellipse cx="0" cy="26" rx="10" ry="20" className="cacao__fruit" />
          <path d="M0 8 L0 44" className="cacao__rib" />
        </g>
      </g>
    </svg>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  const { status, errorKey, startDemo } = useSession();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const starting = status === 'starting';
  const steps = ['data', 'scenario', 'compare', 'decide'] as const;
  const principles = ['evidence', 'uncertainty', 'support'] as const;

  return (
    <div className="landing">
      <section aria-labelledby="landing-title" className="landing-hero">
        <div className="landing-hero__copy">
          <span className="landing-eyebrow">{t('landing.eyebrow')}</span>
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
              onClick={() => void startDemo()}
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

        <div className="landing-hero__visual">
          <CropScene label={t('landing.hero.scene')} />
          <div className="range-card" aria-hidden="true">
            <p className="range-card__title">{t('landing.hero.rangeTitle')}</p>
            <div className="range-card__track">
              <span className="range-card__band" />
              <span className="range-card__mark" />
            </div>
            <p className="range-card__scale">
              <span>{t('landing.hero.low')}</span>
              <span>{t('landing.hero.high')}</span>
            </p>
            <p className="range-card__note">{t('landing.hero.rangeNote')}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="what-title" className="landing-what">
        <div>
          <span className="landing-eyebrow">{t('landing.what.eyebrow')}</span>
          <h3 id="what-title">{t('landing.what.title')}</h3>
        </div>
        <div className="landing-what__body">
          <p>{t('landing.what.body1')}</p>
          <p>{t('landing.what.body2')}</p>
        </div>
      </section>

      <section aria-labelledby="how-title" className="landing-how">
        <h3 id="how-title">{t('landing.how.title')}</h3>
        <ol className="how-steps">
          {steps.map((step) => (
            <li key={step}>
              <h4>{t(`landing.how.steps.${step}.title`)}</h4>
              <p>{t(`landing.how.steps.${step}.description`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="crops-title" className="landing-crops">
        <h3 id="crops-title">{t('landing.crops.title')}</h3>
        <div className="crop-photos">
          <figure className="crop-photo crop-photo--maize">
            <img src="/landing/maize.jpg" alt="" loading="lazy" width="1400" height="1050" />
            <figcaption>
              <strong>{t('landing.crops.maize.name')}</strong>
              <span>{t('landing.crops.maize.description')}</span>
            </figcaption>
          </figure>
          <figure className="crop-photo crop-photo--cacao">
            <img src="/landing/cacao.jpg" alt="" loading="lazy" width="1100" height="512" />
            <figcaption>
              <strong>{t('landing.crops.cacao.name')}</strong>
              <span>{t('landing.crops.cacao.description')}</span>
            </figcaption>
          </figure>
        </div>
        <p className="landing-credit">{t('landing.crops.credit')}</p>
      </section>

      <section aria-labelledby="principles-title" className="landing-principles">
        <h3 id="principles-title">{t('landing.principles.title')}</h3>
        <ul>
          {principles.map((key) => (
            <li key={key}>
              <h4>{t(`landing.benefits.${key}.title`)}</h4>
              <p>{t(`landing.benefits.${key}.description`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="final-title" className="landing-final">
        <h3 id="final-title">{t('landing.finalCta.title')}</h3>
        <p>{t('landing.finalCta.body')}</p>
        <button
          type="button"
          className="button button--primary landing-primary-btn"
          disabled={starting}
          onClick={() => void startDemo()}
        >
          {t('landing.finalCta.button')}
        </button>
      </section>
    </div>
  );
}
