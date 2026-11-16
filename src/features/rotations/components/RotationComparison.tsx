import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, LoadingState } from '../../../components/AsyncState';
import { ProvenanceBlock } from '../../../components/ProvenanceBlock';
import { hasRequiredBlocks, orderStrategies } from '../../../domain/strategies';
import type { RotationStrategy } from '../../../domain/strategies';
import type { RecommendationSet, ScenarioInput } from '../../../services/types';
import { useRecommendations } from '../hooks/useRecommendations';
import { StrategyCard } from './StrategyCard';
import { StrategyDetailScreen } from './StrategyDetailScreen';

const MIN_STRATEGIES = 3;

function Comparison({
  set,
  busy,
  onOpen,
}: {
  set: RecommendationSet;
  busy: boolean;
  onOpen: (strategy: RotationStrategy) => void;
}) {
  const { t } = useTranslation();
  const shown = orderStrategies(set.strategies.filter(hasRequiredBlocks));
  const omitted = set.strategies.length - shown.length;

  if (set.strategies.length === 0) return <EmptyState>{t('rotations.empty')}</EmptyState>;

  return (
    <div className="stack" aria-busy={busy}>
      {busy ? (
        <p role="status" className="state state--loading">
          {t('rotations.updating')}
        </p>
      ) : null}
      <p>{t('rotations.order')}</p>
      {omitted > 0 ? (
        <p role="alert" className="state state--warning">
          {t('rotations.omitted', { count: omitted })}
        </p>
      ) : null}
      {shown.length < MIN_STRATEGIES ? (
        <p className="state state--warning">{t('rotations.fewerThanThree')}</p>
      ) : null}
      <ol className="strategies">
        {shown.map((strategy, index) => (
          <li key={strategy.id}>
            <StrategyCard strategy={strategy} isTopScore={index === 0} onOpen={onOpen} />
          </li>
        ))}
      </ol>
      <p>{set.disclaimer}</p>
      <ProvenanceBlock provenance={set.provenance} />
    </div>
  );
}

export function RotationComparison({
  farmId,
  scenario,
  revision = 0,
  onDetailChange,
}: {
  farmId: string;
  scenario: ScenarioInput;
  revision?: number;
  /** Tells the page when a strategy screen is open, so it can hide what is above. */
  onDetailChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<RotationStrategy | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    onDetailChange?.(selected !== null);
    // coming back from a strategy screen: put focus on the comparison title
    if (wasOpen.current && selected === null) titleRef.current?.focus();
    wasOpen.current = selected !== null;
  }, [selected, onDetailChange]);
  const { resource, reload, stale } = useRecommendations(farmId, scenario, revision);

  let body;
  if (resource.status === 'error') body = <ErrorState error={resource.error} onRetry={reload} />;
  else if (resource.status === 'success')
    body = <Comparison set={resource.data} busy={false} onOpen={setSelected} />;
  else if (stale) body = <Comparison set={stale} busy onOpen={setSelected} />;
  else body = <LoadingState label={t('rotations.loading')} />;

  const backToPriorities = () => {
    const target = document.getElementById('priorities-title');
    if (target) {
      target.focus();
      target.scrollIntoView?.({ behavior: 'smooth' });
    }
  };

  if (selected) {
    return (
      <StrategyDetailScreen strategy={selected} farmId={farmId} onBack={() => setSelected(null)} />
    );
  }

  return (
    <section aria-labelledby="rotations-title" className="card stack">
      <div>
        <div className="rotations-header-row">
          <h3 id="rotations-title" ref={titleRef} tabIndex={-1}>
            {t('rotations.title')}
          </h3>
          <button type="button" className="button button--secondary" onClick={backToPriorities}>
            {t('rotations.backToPriorities')}
          </button>
        </div>
        <p>{t('rotations.intro')}</p>
      </div>
      {body}
    </section>
  );
}
