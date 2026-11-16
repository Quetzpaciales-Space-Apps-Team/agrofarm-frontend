import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, LoadingState } from '../../../components/AsyncState';
import { formatArea, humanizeId } from '../../../domain/months';
import { FarmZoneMap } from '../../map/components/FarmZoneMap';
import { useFarm } from '../hooks/useFarm';
import { useApi } from '../../../services/ApiContext';
import { updateFarm } from '../../../services/api';
import type { Farm } from '../../../services/types';

export function FarmDashboard({ farmId }: { farmId: string }) {
  const { t, i18n } = useTranslation();
  const { resource, reload } = useFarm(farmId);
  const { client } = useApi();
  const [isSaving, setIsSaving] = useState(false);

  if (resource.status === 'loading') return <LoadingState label={t('farm.loading')} />;
  if (resource.status === 'error') return <ErrorState error={resource.error} onRetry={reload} />;

  const farm = resource.data;

  const handleSaveBoundary = async (newBoundary: Farm['boundary']) => {
    setIsSaving(true);
    try {
      await updateFarm(client, farm.id, { boundary: newBoundary });
      reload();
    } finally {
      setIsSaving(false);
    }
  };

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
      <FarmZoneMap
        farmId={farm.id}
        farmName={farm.name}
        areaHa={farm.area_ha}
        boundary={farm.boundary}
        onSaveBoundary={handleSaveBoundary}
        isSaving={isSaving}
      />
    </div>
  );
}
