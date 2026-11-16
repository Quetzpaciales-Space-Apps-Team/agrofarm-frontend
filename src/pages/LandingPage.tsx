import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { useSession } from '../features/auth/state/session';

const STEPS = ['field', 'plant', 'cob', 'decision'] as const;
const FLIPS = ['data', 'scenario', 'compare', 'decide'] as const;
const DECISIONS = ['rotate', 'dry', 'fallow', 'doubt'] as const;
const PRINCIPLES = ['evidence', 'uncertainty', 'support'] as const;
const BLOCKS = ['project', 'journey', 'how', 'decisions', 'crops', 'limits'] as const;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const smooth = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** Camera for the journey: p is the scroll progress, 0 (whole field) to 1 (decision). */
function camera(p: number) {
  const toPlant = smooth(0.08, 0.4, p);
  const toCob = smooth(0.42, 0.78, p);
  const scale = 1 + 1.1 * toPlant + 3.3 * toCob;
  const fx = 300 + 46 * toCob;
  const fy = 300 + 12 * toCob;
  return {
    transform: `translate(300 300) scale(${scale.toFixed(3)}) translate(${-fx.toFixed(2)} ${-fy.toFixed(2)})`,
    farOpacity: 1 - toPlant,
    step: p < 0.22 ? 0 : p < 0.5 ? 1 : p < 0.8 ? 2 : 3,
  };
}

function RangeCard({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`range-card ${className}`} aria-hidden="true">
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
  );
}

interface JourneyRefs {
  farRef: RefObject<SVGGElement | null>;
  cameraRef: RefObject<SVGGElement | null>;
}

/** The close-up maize plant the scroll journey moves toward. */
function JourneyPlant({ label, farRef, cameraRef }: JourneyRefs & { label: string }) {
  const far = [20, 60, 100, 140, 180, 220, 260, 300, 340, 380, 420, 460, 500, 540, 580];
  const leaves = [
    'M300 430 Q215 370 140 420',
    'M300 380 Q390 320 470 372',
    'M300 330 Q220 270 150 318',
    'M300 280 Q385 222 455 262',
    'M300 230 Q240 180 190 210',
  ];
  const rows = Array.from({ length: 11 }, (_, index) => 276 + index * 9);
  return (
    <svg className="journey-svg" viewBox="0 0 600 600" role="img" aria-label={label}>
      <rect width="600" height="600" className="journey-svg__sky" />
      <circle cx="500" cy="90" r="34" className="crop-scene__sun" />
      <g ref={cameraRef}>
        <rect y="540" width="600" height="400" className="crop-scene__soil" />
        <g ref={farRef}>
          {far.map((x, index) => (
            <g
              key={x}
              transform={`translate(${x + (index % 2) * 10} ${532 - (index % 2) * 14}) scale(0.3)`}
            >
              <path
                d="M0 0 L0 -120 M0 -40 Q-30 -70 -45 -50 M0 -70 Q30 -100 45 -80"
                className="stalk__leaf"
              />
            </g>
          ))}
        </g>
        <path d="M300 545 L300 150" className="stalk__stem journey-svg__stem" />
        {leaves.map((d) => (
          <path key={d} d={d} className="stalk__leaf journey-svg__leaf" />
        ))}
        <path
          d="M300 150 Q290 110 300 80 M300 150 Q312 112 322 90 M300 150 Q282 120 276 96"
          className="journey-svg__tassel"
        />
        <ellipse cx="346" cy="322" rx="19" ry="54" className="stalk__cob" />
        {rows.map((y, rowIndex) =>
          [-9, 0, 9].map((dx) => (
            <circle
              key={`${y}-${dx}`}
              cx={346 + dx + (rowIndex % 2 ? 4 : -1)}
              cy={y + 12}
              r="3.4"
              className="journey-svg__kernel"
            />
          )),
        )}
        <path d="M328 380 Q308 322 338 262" className="journey-svg__husk" />
        <path d="M364 380 Q384 322 354 262" className="journey-svg__husk" />
      </g>
    </svg>
  );
}

/** Pinned storytelling block: scrolling moves the camera from the field to a single cob. */
function Journey() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const cameraRef = useRef<SVGGElement>(null);
  const farRef = useRef<SVGGElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    const apply = (p: number) => {
      const view = camera(p);
      cameraRef.current?.setAttribute('transform', view.transform);
      farRef.current?.setAttribute('opacity', view.farOpacity.toFixed(3));
      setStep(view.step);
    };
    if (prefersReducedMotion()) {
      apply(0.6);
      return undefined;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      apply(total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    // Capture phase: on small screens the page scrolls inside <main>, not the window.
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={sectionRef} id="journey" aria-labelledby="journey-title" className="journey">
      <div className="journey__stage">
        <div className="journey__copy">
          <h3 id="journey-title">{t('landing.journey.title')}</h3>
          <ol className="journey__steps">
            {STEPS.map((key, index) => (
              <li key={key} className="journey__step" data-active={index === step}>
                <h4>{t(`landing.journey.steps.${key}.title`)}</h4>
                <p>{t(`landing.journey.steps.${key}.body`)}</p>
              </li>
            ))}
          </ol>
          <p className="journey__hint" aria-hidden="true">
            {t('landing.journey.scrollHint')}
          </p>
        </div>
        <div className="journey__visual">
          <JourneyPlant label={t('landing.journey.scene')} farRef={farRef} cameraRef={cameraRef} />
          <img
            className="journey__photo"
            data-on={step >= 2}
            src="/landing/cob-close.webp"
            alt=""
            width="1000"
            height="1000"
            loading="lazy"
          />
          <RangeCard className={`journey__range${step === 3 ? ' journey__range--on' : ''}`} />
        </div>
      </div>
    </section>
  );
}

const ICON_PATHS: Record<(typeof FLIPS)[number], string> = {
  data: 'M12 16V4m0 0L7 9m5-5 5 5M5 20h14',
  scenario: 'M4 8h10m4 0h2M4 16h2m4 0h10M14 5v6M8 13v6',
  compare: 'M5 20V10m7 10V4m7 16v-7',
  decide: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3zm-3 9 2 2 4-4',
};

function FlipCard({ name }: { name: (typeof FLIPS)[number] }) {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  return (
    <li>
      <button
        type="button"
        className="flip"
        aria-pressed={flipped}
        data-flipped={flipped}
        onClick={() => setFlipped((value) => !value)}
      >
        <span className="flip__inner">
          <span className="flip__face flip__face--front">
            <svg className="flip__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d={ICON_PATHS[name]} />
            </svg>
            <span className="flip__title">{t(`landing.how.steps.${name}.title`)}</span>
            <span className="flip__hint">{t('landing.how.hint')}</span>
          </span>
          <span className="flip__face flip__face--back">
            <span className="flip__title">{t(`landing.how.steps.${name}.title`)}</span>
            <span className="flip__body">{t(`landing.how.steps.${name}.description`)}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  const { status, errorKey, startDemo } = useSession();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const starting = status === 'starting';

  const goTo = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="landing">
      <section aria-labelledby="landing-title" className="band band--night landing-hero">
        <div className="band__inner landing-hero__grid">
          <div className="landing-hero__copy">
            <h2 id="landing-title" ref={headingRef} tabIndex={-1}>
              {t('landing.title')}
            </h2>
            <p className="landing-intro">{t('landing.intro')}</p>
            <div className="landing-actions">
              <button
                type="button"
                className="button landing-primary-btn"
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
            <div className="hero-cob">
              <img
                src="/landing/cob-full.webp"
                alt={t('landing.hero.scene')}
                width="1400"
                height="1120"
                fetchPriority="high"
              />
            </div>
            <RangeCard />
          </div>
        </div>
        <nav aria-label={t('landing.nav.label')} className="band__inner block-nav">
          {BLOCKS.map((id) => (
            <a key={id} href={`#${id}`} onClick={(event) => goTo(event, id)}>
              {t(`landing.nav.${id}`)}
            </a>
          ))}
        </nav>
      </section>

      <section id="project" aria-labelledby="what-title" className="band band--paper">
        <div className="band__inner landing-what">
          <h3 id="what-title">{t('landing.what.title')}</h3>
          <div className="landing-what__body">
            <p>{t('landing.what.body1')}</p>
            <p>{t('landing.what.body2')}</p>
          </div>
        </div>
      </section>

      <Journey />

      <section id="how" aria-labelledby="how-title" className="band band--sage">
        <div className="band__inner landing-how">
          <h3 id="how-title">{t('landing.how.title')}</h3>
          <ul className="flip-grid">
            {FLIPS.map((name) => (
              <FlipCard key={name} name={name} />
            ))}
          </ul>
        </div>
      </section>

      <section id="decisions" aria-labelledby="decisions-title" className="band band--paper">
        <div className="band__inner landing-decisions">
          <div className="landing-decisions__head">
            <h3 id="decisions-title">{t('landing.decisions.title')}</h3>
            <p>{t('landing.decisions.intro')}</p>
          </div>
          <div className="decision-table" role="table" aria-label={t('landing.decisions.title')}>
            <div className="decision-row decision-row--head" role="row">
              {(['question', 'shows', 'limit'] as const).map((key) => (
                <span key={key} role="columnheader">
                  {t(`landing.decisions.columns.${key}`)}
                </span>
              ))}
            </div>
            {DECISIONS.map((key) => (
              <div key={key} className="decision-row" role="row">
                <strong role="cell" data-label={t('landing.decisions.columns.question')}>
                  {t(`landing.decisions.rows.${key}.question`)}
                </strong>
                <span role="cell" data-label={t('landing.decisions.columns.shows')}>
                  {t(`landing.decisions.rows.${key}.shows`)}
                </span>
                <span
                  role="cell"
                  className="decision-row__limit"
                  data-label={t('landing.decisions.columns.limit')}
                >
                  {t(`landing.decisions.rows.${key}.limit`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="crops" aria-labelledby="crops-title" className="band band--sage">
        <div className="band__inner landing-crops">
          <h3 id="crops-title">{t('landing.crops.title')}</h3>
          <div className="crop-photos">
            <figure className="crop-photo">
              <img src="/landing/maize.jpg" alt="" loading="lazy" width="1400" height="1050" />
              <figcaption>
                <strong>{t('landing.crops.maize.name')}</strong>
                <span>{t('landing.crops.maize.description')}</span>
              </figcaption>
            </figure>
            <figure className="crop-photo">
              <img src="/landing/cacao.jpg" alt="" loading="lazy" width="1100" height="512" />
              <figcaption>
                <strong>{t('landing.crops.cacao.name')}</strong>
                <span>{t('landing.crops.cacao.description')}</span>
              </figcaption>
            </figure>
          </div>
          <p className="landing-credit">{t('landing.crops.credit')}</p>
        </div>
      </section>

      <section id="limits" aria-labelledby="principles-title" className="band band--night">
        <div className="band__inner landing-limits">
          <h3 id="principles-title">{t('landing.principles.title')}</h3>
          <ul className="landing-principles">
            {PRINCIPLES.map((key) => (
              <li key={key}>
                <h4>{t(`landing.benefits.${key}.title`)}</h4>
                <p>{t(`landing.benefits.${key}.description`)}</p>
              </li>
            ))}
          </ul>
          <div className="landing-final">
            <h3>{t('landing.finalCta.title')}</h3>
            <p>{t('landing.finalCta.body')}</p>
            <button
              type="button"
              className="button landing-primary-btn"
              disabled={starting}
              onClick={() => void startDemo()}
            >
              {t('landing.finalCta.button')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
