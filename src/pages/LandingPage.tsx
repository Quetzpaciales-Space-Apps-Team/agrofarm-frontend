import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { useSession } from '../features/auth/state/session';
import { CropsBlock } from './landing/CropsBlock';

const STEPS = ['field', 'plant', 'cob', 'decision'] as const;
const FLIPS = ['data', 'scenario', 'compare', 'decide'] as const;
const DECISIONS = ['rotate', 'dry', 'fallow', 'doubt'] as const;
const PRINCIPLES = ['evidence', 'uncertainty', 'support'] as const;
const BLOCKS = ['project', 'journey', 'how', 'decisions', 'crops', 'limits'] as const;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const reveal = (index: number): { 'data-reveal': string; style: CSSProperties } => ({
  'data-reveal': '',
  style: { '--i': index } as CSSProperties,
});

function Arrow() {
  return (
    <svg className="btn-arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

/** Page-level microinteractions: scroll progress bar and reveal-on-scroll for marked items. */
function useLandingEffects(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      root.style.setProperty('--page', p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    let observer: IntersectionObserver | null = null;
    if (!prefersReducedMotion() && typeof IntersectionObserver === 'function') {
      root.classList.add('js-reveal');
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).dataset.in = 'true';
              observer?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
      );
      root.querySelectorAll('[data-reveal]').forEach((node) => observer?.observe(node));
    }
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      root.classList.remove('js-reveal');
    };
  }, [rootRef]);
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

const FRAME_COUNT = 48;
const frameUrl = (index: number) => `/landing/seq/f${String(index).padStart(3, '0')}.webp`;
const stepAt = (p: number) => (p < 0.22 ? 0 : p < 0.5 ? 1 : p < 0.8 ? 2 : 3);

/**
 * Pinned storytelling block. The ear of maize was rendered in Blender as a short image
 * sequence (the camera moves closer and turns while kernels pop out); scrolling scrubs it.
 */
function Journey() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(() => (prefersReducedMotion() ? 3 : 0));

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!section || !canvas || !context) return undefined;
    const reduce = prefersReducedMotion();
    const images: (HTMLImageElement | undefined)[] = [];
    let current = reduce ? 30 : 0;
    let started = false;
    const draw = () => {
      for (let i = current; i >= 0; i -= 1) {
        const image = images[i];
        if (image?.complete && image.naturalWidth > 0) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          return;
        }
      }
    };
    const load = () => {
      if (started) return;
      started = true;
      for (let i = 0; i < FRAME_COUNT; i += 1) {
        const image = new Image();
        image.onload = () => {
          if (i <= current) draw();
        };
        image.src = frameUrl(i);
        images[i] = image;
      }
    };
    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) load();
            },
            { rootMargin: '1200px 0px' },
          )
        : null;
    if (observer) observer.observe(section);
    else load();
    if (reduce) {
      return () => observer?.disconnect();
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      current = Math.round(p * (FRAME_COUNT - 1));
      draw();
      setStep(stepAt(p));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    // Capture phase: on small screens the page scrolls inside <main>, not the window.
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    return () => {
      observer?.disconnect();
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
              <li
                key={key}
                className="journey__step"
                data-reached={index <= step}
                data-active={index === step}
              >
                <span className="journey__node" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="journey__card">
                  <h4>{t(`landing.journey.steps.${key}.title`)}</h4>
                  <div className="journey__body">
                    <div>
                      <p>{t(`landing.journey.steps.${key}.body`)}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="journey__hint" aria-hidden="true">
            {t('landing.journey.scrollHint')}
          </p>
        </div>
        <div className="journey__visual">
          <canvas
            ref={canvasRef}
            className="journey__canvas"
            width={760}
            height={760}
            role="img"
            aria-label={t('landing.journey.scene')}
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

function FlipCard({ name, index }: { name: (typeof FLIPS)[number]; index: number }) {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  return (
    <li {...reveal(index)}>
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
  const rootRef = useRef<HTMLDivElement>(null);
  useLandingEffects(rootRef);

  const launchDemo = () => {
    try {
      sessionStorage.setItem('agrofarm_auto_tour', 'true');
    } catch {
      // ignore in private browsing
    }
    void startDemo();
  };

  const onHeroMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    const style = event.currentTarget.style;
    style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    style.setProperty('--tx', ((x - 0.5) * 2).toFixed(3));
    style.setProperty('--ty', ((y - 0.5) * 2).toFixed(3));
  };

  const goTo = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="landing" ref={rootRef}>
      <div className="scroll-progress" aria-hidden="true" />
      <section
        aria-labelledby="landing-title"
        className="band band--night landing-hero"
        onPointerMove={onHeroMove}
      >
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
                onClick={launchDemo}
              >
                {starting ? t('landing.starting') : t('landing.tryDemo')}
                <Arrow />
              </button>
              <p className="landing-demo-note">{t('landing.demoNote')}</p>
            </div>
            {status === 'error' && errorKey ? (
              <p role="alert" className="state state--error">
                {t(errorKey)}
              </p>
            ) : null}
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
            {FLIPS.map((name, index) => (
              <FlipCard key={name} name={name} index={index} />
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
            {DECISIONS.map((key, index) => (
              <div key={key} className="decision-row" role="row" {...reveal(index)}>
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
        <CropsBlock />
      </section>

      <section id="limits" aria-labelledby="principles-title" className="band band--night">
        <div className="band__inner landing-limits">
          <h3 id="principles-title">{t('landing.principles.title')}</h3>
          <ul className="landing-principles">
            {PRINCIPLES.map((key, index) => (
              <li key={key} {...reveal(index)}>
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
              onClick={launchDemo}
            >
              {t('landing.finalCta.button')}
              <Arrow />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
