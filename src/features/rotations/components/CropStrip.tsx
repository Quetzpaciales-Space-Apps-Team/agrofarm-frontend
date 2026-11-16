import { useTranslation } from 'react-i18next';
import { cropFor } from '../../../domain/crops';
import { humanizeId } from '../../../domain/months';

/** The crops of a strategy in order, each with its photo. Small on a card, large in the banner. */
export function CropStrip({ sequence, size }: { sequence: string[]; size: 'card' | 'banner' }) {
  const { t } = useTranslation();
  return (
    <ol
      className={`crop-strip crop-strip--${size}`}
      aria-label={t('rotations.detail.sequenceLabel')}
    >
      {sequence.map((step, index) => {
        const crop = cropFor(step);
        const name = crop ? t(`rotations.crops.${crop.id}.name`) : humanizeId(step);
        return (
          <li key={`${step}-${index}`} className="crop-strip__item">
            {crop ? (
              <img src={crop.image} alt="" loading="lazy" width="480" height="360" />
            ) : (
              <span className="crop-strip__blank">{t('rotations.detail.unknownCrop')}</span>
            )}
            <span className="crop-strip__label">
              <small>{t('rotations.detail.season', { n: index + 1 })}</small>
              <strong>{name}</strong>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
