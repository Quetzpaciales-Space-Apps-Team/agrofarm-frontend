import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, LoadingState } from '../../../components/AsyncState';
import { ProvenanceBlock } from '../../../components/ProvenanceBlock';
import { hasRequiredBlocks, orderStrategies } from '../../../domain/strategies';
import type { RecommendationSet, ScenarioInput } from '../../../services/types';
import { useRecommendations } from '../hooks/useRecommendations';
import { StrategyCard } from './StrategyCard';

const MIN_STRATEGIES = 3;

function Comparison({ set, busy }: { set: RecommendationSet; busy: boolean }) {
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
            <StrategyCard strategy={strategy} isTopScore={index === 0} />
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
}: {
  farmId: string;
  scenario: ScenarioInput;
}) {
  const { t } = useTranslation();
  const { resource, reload, stale } = useRecommendations(farmId, scenario);

  let body;
  if (resource.status === 'error') body = <ErrorState error={resource.error} onRetry={reload} />;
  else if (resource.status === 'success') body = <Comparison set={resource.data} busy={false} />;
  else if (stale) body = <Comparison set={stale} busy />;
  else body = <LoadingState label={t('rotations.loading')} />;

  return (
    <section aria-labelledby="rotations-title" className="card stack">
      <div>
        <h3 id="rotations-title">{t('rotations.title')}</h3>
        <p>{t('rotations.intro')}</p>
      </div>
      {body}
    </section>
  );
}
