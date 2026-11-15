import { useTranslation } from 'react-i18next';
import { ensoCells, ensoCode, type EnsoPhase } from '../../../domain/enso';
import { formatMonth } from '../../../domain/months';

const PHASES: (EnsoPhase | null)[] = ['el_nino', 'la_nina', 'neutral', null];
const phaseKey = (phase: EnsoPhase | null) => phase ?? 'none';

export function EnsoStrip({
  months,
  items,
  source,
  threshold,
}: {
  months: string[];
  items: { month: string; phase: EnsoPhase }[];
  source: string;
  threshold: number;
}) {
  const { t, i18n } = useTranslation();
  const cells = ensoCells(months, items);

  return (
    <section aria-labelledby="enso-title" className="stack">
      <h4 id="enso-title">{t('enso.title')}</h4>
      <p>{t('enso.intro')}</p>
      <ol className="enso-strip" aria-label={t('enso.listLabel')}>
        {cells.map((cell) => (
          <li key={cell.month} className={`enso-cell enso-cell--${phaseKey(cell.phase)}`}>
            <span>{formatMonth(cell.month, i18n.language, 'tick')}</span>
            <strong>{ensoCode(cell.phase)}</strong>
            <span className="visually-hidden">{t(`enso.phase.${phaseKey(cell.phase)}`)}</span>
          </li>
        ))}
      </ol>
      <ul className="enso-legend" aria-label={t('enso.legend')}>
        {PHASES.map((phase) => (
          <li key={phaseKey(phase)}>
            <span className={`enso-cell enso-cell--${phaseKey(phase)}`}>
              <strong>{ensoCode(phase)}</strong>
            </span>{' '}
            {t(`enso.phase.${phaseKey(phase)}`)}
          </li>
        ))}
      </ul>
      <p className="source">{t('enso.source', { source, threshold })}</p>
    </section>
  );
}
