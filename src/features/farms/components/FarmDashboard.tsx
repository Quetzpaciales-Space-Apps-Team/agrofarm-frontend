import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, LoadingState } from '../../../components/AsyncState';
import { formatArea, humanizeId } from '../../../domain/months';
import { FarmZoneMap } from '../../map/components/FarmZoneMap';
import { useFarm } from '../hooks/useFarm';

export function FarmDashboard({ farmId }: { farmId: string }) {
  const { t, i18n } = useTranslation();
  const { resource, reload } = useFarm(farmId);

  if (resource.status === 'loading') return <LoadingState label={t('farm.loading')} />;
  if (resource.status === 'error') return <ErrorState error={resource.error} onRetry={reload} />;

  const farm = resource.data;
  return (
    <div className="farm-dashboard-stack">
      <section aria-labelledby="farm-name" className="card farm-summary">
        <h3 id="farm-name">{farm.name}</h3>
        <dl className="facts">
          <div>
            <dt>{t('farm.area')}</dt>
            <dd>{formatArea(farm.area_ha, i18n.language)}</dd>
          </div>
          <div>
            <dt id="rotation-label">{t('farm.rotation')}</dt>
            <dd>
              {farm.current_rotation.length === 0 ? (
                <EmptyState>{t('farm.noRotation')}</EmptyState>
              ) : (
                <ol aria-labelledby="rotation-label" className="chips">
                  {farm.current_rotation.map((crop, index) => (
                    <li key={`${crop}-${index}`}>{humanizeId(crop)}</li>
                  ))}
                </ol>
              )}
            </dd>
          </div>
        </dl>
      </section>
      <FarmZoneMap farmName={farm.name} areaHa={farm.area_ha} boundary={farm.boundary} />
    </div>
  );
}
