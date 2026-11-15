import { useTranslation } from 'react-i18next';
import { GlossaryTerm } from '../../../components/GlossaryTerm';
import { GlossaryText } from '../../../components/GlossaryText';
import { GLOSSARY_TERMS, safeEvidenceUrl } from '../../../domain/glossary';
import { humanizeId } from '../../../domain/months';
import { toPercent, type RotationStrategy } from '../../../domain/strategies';
import { PriorityScores } from './PriorityScores';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** Body of the strategy drawer: the five blocks in detail, evidence links and glossary tooltips. */
export function StrategyDetail({ strategy }: { strategy: RotationStrategy }) {
  const { t } = useTranslation();
  const sequence = strategy.sequence.map(humanizeId).join(t('rotations.sequenceJoin'));

  return (
    <>
      <p className="state state--warning">{t('rotations.drawer.intro')}</p>
      <ul className="badges" aria-label={t('rotations.markers')}>
        {strategy.is_current ? (
          <li className="badge badge--current">{t('rotations.current')}</li>
        ) : null}
        {strategy.needs_local_review ? (
          <li className="badge badge--review">{t('rotations.needsReview')}</li>
        ) : null}
      </ul>
      <p className="source">{sequence}</p>

      <Block title={t('rotations.drawer.scoresHeading')}>
        <p className="score">
          {t('rotations.overall', { score: toPercent(strategy.overall_score) })}
        </p>
        <p className="source">
          {t('rotations.interval', {
            low: toPercent(strategy.uncertainty.low),
            high: toPercent(strategy.uncertainty.high),
          })}
        </p>
        <PriorityScores scores={strategy.scores} />
      </Block>

      <Block title={t('rotations.blocks.why')}>
        <ul>
          {strategy.why.map((item) => (
            <li key={item}>
              <GlossaryText text={item} />
            </li>
          ))}
        </ul>
      </Block>
      <Block title={t('rotations.blocks.evidence')}>
        <ul>
          {strategy.evidence.map((item) => {
            const url = safeEvidenceUrl(item);
            return (
              <li key={item.statement}>
                <GlossaryText text={item.statement} />{' '}
                <span className="source">{t('rotations.source', { source: item.source })}</span>
                {url ? (
                  <>
                    {' '}
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {t('rotations.drawer.sourceLink', { source: item.source })}{' '}
                      {t('rotations.drawer.sourceLinkHint')}
                    </a>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Block>
      <Block title={t('rotations.blocks.benefits')}>
        <ul>
          {strategy.benefits.map((item) => (
            <li key={item}>
              <GlossaryText text={item} />
            </li>
          ))}
        </ul>
      </Block>
      <Block title={t('rotations.blocks.gaps')}>
        <ul>
          {strategy.gaps.map((item) => (
            <li key={item}>
              <GlossaryText text={item} />
            </li>
          ))}
        </ul>
      </Block>
      <Block title={t('rotations.blocks.risks')}>
        <ul>
          {strategy.risks.map((item) => (
            <li key={item.description}>
              <GlossaryText text={item.description} />{' '}
              {item.needs_local_review ? (
                <strong className="review-note">{t('rotations.riskReview')}</strong>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>

      <Block title={t('rotations.drawer.termsHeading')}>
        <p className="source">{t('rotations.drawer.termsHint')}</p>
        <ul className="glossary-list">
          {GLOSSARY_TERMS.map((term) => (
            <li key={term}>
              <GlossaryTerm term={term} label={t(`glossary.terms.${term}.label`)} />
            </li>
          ))}
        </ul>
        <p className="source">{t('rotations.drawer.glossaryNote')}</p>
      </Block>
    </>
  );
}
