import { useTranslation } from 'react-i18next';
import { CREDITS_URL, REPOS, TEAM, profileUrl } from './team';

const YEAR = 2026;

function External({ href, children }: { href: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> {t('landing.footer.newTab')}</span>
    </a>
  );
}

/** Team, repositories and copyright, at the very end of the landing page. */
export function LandingFooter() {
  const { t } = useTranslation();
  return (
    <section id="team" aria-labelledby="team-title" className="band band--night landing-footer">
      <div className="band__inner">
        <div className="landing-footer__grid">
          <div className="landing-footer__about">
            <h3 id="team-title">{t('landing.footer.title')}</h3>
            <p>{t('landing.footer.about')}</p>
          </div>

          <div>
            <h4>{t('landing.footer.teamTitle')}</h4>
            <ul className="landing-footer__list">
              {TEAM.map((handle) => (
                <li key={handle}>
                  <External href={profileUrl(handle)}>{handle}</External>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>{t('landing.footer.reposTitle')}</h4>
            <ul className="landing-footer__list landing-footer__list--repos">
              {REPOS.map((repo) => (
                <li key={repo.id}>
                  <External href={repo.url}>{repo.name}</External>
                  <span>{t(`landing.footer.repos.${repo.id}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="landing-footer__legal">
          <p>{t('landing.footer.copyright', { year: YEAR })}</p>
          <p>{t('landing.footer.nasa')}</p>
          <p>
            <External href={CREDITS_URL}>{t('landing.footer.photoCredits')}</External>
          </p>
        </div>
      </div>
    </section>
  );
}
