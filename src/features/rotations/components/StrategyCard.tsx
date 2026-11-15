import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { humanizeId } from '../../../domain/months';
import { PRIORITY_KEYS, toPercent, type RotationStrategy } from '../../../domain/strategies';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h5>{title}</h5>
      {children}
    </div>
  );
}

export function StrategyCard({
  strategy,
  isTopScore,
}: {
  strategy: RotationStrategy;
  isTopScore: boolean;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const sequence = strategy.sequence.map(humanizeId).join(t('rotations.sequenceJoin'));

  return (
    <article aria-labelledby={titleId} className="card strategy">
      <header>
        <ul className="badges" aria-label={t('rotations.markers')}>
          {isTopScore ? <li className="badge badge--info">{t('rotations.topScore')}</li> : null}
          {strategy.is_current ? (
            <li className="badge badge--current">{t('rotations.current')}</li>
          ) : null}
          {strategy.needs_local_review ? (
            <li className="badge badge--review">{t('rotations.needsReview')}</li>
          ) : null}
        </ul>
        <h4 id={titleId}>{strategy.name}</h4>
        <p className="source">{sequence}</p>
      </header>

      <div>
        <p className="score">
          {t('rotations.overall', { score: toPercent(strategy.overall_score) })}
        </p>
        <p className="source">
          {t('rotations.interval', {
            low: toPercent(strategy.uncertainty.low),
            high: toPercent(strategy.uncertainty.high),
          })}
        </p>
        <ul className="priority-scores" aria-label={t('rotations.priorityScores')}>
          {PRIORITY_KEYS.map((key) => {
            const value = toPercent(strategy.scores[key]);
            return (
              <li key={key}>
                <span className="priority-name">{t(`rotations.priority.${key}`)}</span>{' '}
                <span className="priority-value">{t('rotations.outOf100', { value })}</span>
                <span className="priority-bar" aria-hidden="true">
                  <span className="priority-fill" style={{ width: `${value}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <Block title={t('rotations.blocks.why')}>
        <ul>
          {strategy.why.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Block>
      <Block title={t('rotations.blocks.evidence')}>
        <ul>
          {strategy.evidence.map((item) => (
            <li key={item.statement}>
              {item.statement}{' '}
              <span className="source">{t('rotations.source', { source: item.source })}</span>
            </li>
          ))}
        </ul>
      </Block>
      <Block title={t('rotations.blocks.benefits')}>
        <ul>
          {strategy.benefits.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Block>
      <Block title={t('rotations.blocks.gaps')}>
        <ul>
          {strategy.gaps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Block>
      <Block title={t('rotations.blocks.risks')}>
        <ul>
          {strategy.risks.map((item) => (
            <li key={item.description}>
              {item.description}{' '}
              {item.needs_local_review ? (
                <strong className="review-note">{t('rotations.riskReview')}</strong>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>
    </article>
  );
}
