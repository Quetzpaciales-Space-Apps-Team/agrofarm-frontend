import { useId } from 'react';
import { useTranslation } from 'react-i18next';

export function ClimateLegend() {
  const { t } = useTranslation();
  const id = useId();
  const line = (cls: string, dash?: string, cap?: 'round') => (
    <svg aria-hidden="true" viewBox="0 0 36 12">
      <path
        className={`swatch-line line--${cls}`}
        d="M2 6 H34"
        strokeDasharray={dash}
        strokeLinecap={cap}
      />
    </svg>
  );
  return (
    <ul className="legend" aria-label={t('climate.legend.title')}>
      <li>
        <svg aria-hidden="true" viewBox="0 0 36 12">
          <rect className="swatch-bar" x="8" y="1" width="20" height="10" />
        </svg>
        {t('climate.legend.rain')}
      </li>
      <li>
        {line('mean')}
        {t('climate.legend.mean')}
      </li>
      <li>
        {line('min', '6 4')}
        {t('climate.legend.min')}
      </li>
      <li>
        {line('max', '1 4', 'round')}
        {t('climate.legend.max')}
      </li>
      <li>
        <svg aria-hidden="true" viewBox="0 0 36 12">
          <defs>
            <pattern
              id={`${id}-p`}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line className="gap-pattern-line" x1="0" y1="0" x2="0" y2="6" />
            </pattern>
          </defs>
          <rect className="swatch-gap" x="8" y="1" width="20" height="10" fill={`url(#${id}-p)`} />
        </svg>
        {t('climate.legend.noData')}
      </li>
    </ul>
  );
}
