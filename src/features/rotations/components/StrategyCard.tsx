import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { humanizeId } from '../../../domain/months';
import { toPercent, type RotationStrategy } from '../../../domain/strategies';
import { PriorityScores } from './PriorityScores';
import { CropStrip } from './CropStrip';

export function StrategyCard({
  strategy,
  isTopScore,
  onOpen,
}: {
  strategy: RotationStrategy;
  isTopScore: boolean;
  onOpen: (strategy: RotationStrategy) => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const sequence = strategy.sequence.map(humanizeId).join(t('rotations.sequenceJoin'));

  return (
    <article aria-labelledby={titleId} className="card strategy">
      <CropStrip sequence={strategy.sequence} size="card" />
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
        <PriorityScores scores={strategy.scores} />
      </div>

      <div>
        <button
          type="button"
          className="button button--secondary"
          aria-label={t('rotations.viewDetailsFor', { name: strategy.name })}
          onClick={() => onOpen(strategy)}
        >
          {t('rotations.viewDetails')}
        </button>
      </div>
    </article>
  );
}
