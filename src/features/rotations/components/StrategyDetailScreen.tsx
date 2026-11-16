import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '../../../components/AsyncState';
import { useFocusOnMount } from '../../../components/useFocusOnMount';
import { cropFor } from '../../../domain/crops';
import { humanizeId } from '../../../domain/months';
import { toPercent, type RotationStrategy } from '../../../domain/strategies';
import { useFarm } from '../../farms/hooks/useFarm';
import { FarmCropMap } from '../../map/components/FarmCropMap';
import { CropStrip } from './CropStrip';
import { StrategyDetail } from './StrategyDetail';

/** A screen of its own for one strategy: photos, what happens, the farm map, then all details. */
export function StrategyDetailScreen({
  strategy,
  farmId,
  onBack,
}: {
  strategy: RotationStrategy;
  farmId: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { resource } = useFarm(farmId);
  const steps = strategy.sequence.map((step) => ({ step, crop: cropFor(step) }));

  useEffect(() => {
    headingRef.current?.scrollIntoView?.({ block: 'start' });
  }, [headingRef]);

  const boundary = resource.status === 'success' ? resource.data.boundary : undefined;
  const hasOutline = (boundary?.coordinates?.[0]?.length ?? 0) > 2;

  return (
    <article aria-labelledby="strategy-screen-title" className="strategy-screen stack">
      <div>
        <button type="button" className="button button--secondary" onClick={onBack}>
          {t('rotations.detail.back')}
        </button>
      </div>

      <header className="strategy-hero">
        <CropStrip sequence={strategy.sequence} size="banner" />
        <div className="strategy-hero__title">
          <h3 id="strategy-screen-title" ref={headingRef} tabIndex={-1}>
            {strategy.name}
          </h3>
          <ul className="badges" aria-label={t('rotations.markers')}>
            {strategy.is_current ? (
              <li className="badge badge--current">{t('rotations.current')}</li>
            ) : null}
            {strategy.needs_local_review ? (
              <li className="badge badge--review">{t('rotations.needsReview')}</li>
            ) : null}
          </ul>
          <p className="strategy-hero__score">
            {t('rotations.detail.overall', { score: toPercent(strategy.overall_score) })}
          </p>
          <p className="source">
            {t('rotations.interval', {
              low: toPercent(strategy.uncertainty.low),
              high: toPercent(strategy.uncertainty.high),
            })}
          </p>
        </div>
      </header>

      <section aria-labelledby="happens-title" className="card stack">
        <h4 id="happens-title">{t('rotations.detail.happensTitle')}</h4>
        <ol className="happens">
          {steps.map(({ step, crop }, index) => (
            <li key={`${step}-${index}`}>
              <h5>
                {t('rotations.detail.season', { n: index + 1 })}:{' '}
                {crop ? t(`rotations.crops.${crop.id}.name`) : humanizeId(step)}
              </h5>
              {crop ? <p>{t(`rotations.crops.${crop.id}.happens`)}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="map-title" className="card stack">
        <div>
          <h4 id="map-title">{t('rotations.detail.mapTitle')}</h4>
          <p>{t('rotations.detail.mapIntro')}</p>
        </div>
        {resource.status === 'loading' ? (
          <LoadingState label={t('rotations.detail.mapLoading')} />
        ) : hasOutline && resource.status === 'success' ? (
          <div className="season-maps">
            {steps.map(({ step, crop }, index) => {
              const season = t('rotations.detail.season', { n: index + 1 });
              const cropName = crop ? t(`rotations.crops.${crop.id}.name`) : humanizeId(step);
              return (
                <figure key={`${step}-${index}`} className="season-map">
                  <FarmCropMap
                    crop={crop?.id}
                    farmName={resource.data.name}
                    boundary={boundary}
                    label={t('rotations.detail.mapLabel', { season, crop: cropName })}
                  />
                  <figcaption>
                    <strong>{season}</strong>
                    <span>{cropName}</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        ) : (
          <p className="state state--warning">{t('rotations.detail.noMap')}</p>
        )}
      </section>

      <section aria-labelledby="more-title" className="card stack">
        <h4 id="more-title">{t('rotations.detail.moreTitle')}</h4>
        <StrategyDetail strategy={strategy} />
      </section>
    </article>
  );
}
