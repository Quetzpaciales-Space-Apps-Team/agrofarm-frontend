import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, LoadingState } from '../../../components/AsyncState';
import {
  analyzeClimateReality,
  comparePresetWithObserved,
  type RealityPhaseGroup,
  type RealityYearEntry,
} from '../../../domain/climateReality';
import { ensoCode, type EnsoPhase } from '../../../domain/enso';
import { formatValue } from '../../../domain/months';
import { formatSigned, type ScenarioValues } from '../../../domain/scenario';
import { findScenarioPreset, type ScenarioPresetId } from '../../../domain/scenarioPresets';
import { useClimate } from '../../climate/hooks/useClimate';
import '../climateReality.css';

const PRESET_FOR_PHASE: Record<EnsoPhase, ScenarioPresetId> = {
  el_nino: 'el_nino_drier',
  la_nina: 'la_nina_wetter',
  neutral: 'normal',
};

function sortChronological(years: readonly RealityYearEntry[]): RealityYearEntry[] {
  return [...years].sort((a, b) => a.year - b.year);
}

export function ClimateRealityCheck({
  onApplyPreset,
}: {
  onApplyPreset?: (values: ScenarioValues) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const { resource, reload } = useClimate();
  const titleId = useId();
  const tableId = useId();

  const [selectedPhase, setSelectedPhase] = useState<EnsoPhase | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [tableOpen, setTableOpen] = useState(false);

  if (resource.status === 'loading') {
    return <LoadingState label={t('realityCheck.loading')} />;
  }
  if (resource.status === 'error') {
    return <ErrorState error={resource.error} onRetry={reload} />;
  }

  const { nasa, enso } = resource.data;
  const summary = analyzeClimateReality(nasa.items, enso.items);

  if (summary.years.length === 0 || summary.overallMeanMm === null) {
    return (
      <section aria-labelledby={titleId} className="stack reality-panel">
        <h4 id={titleId}>{t('realityCheck.title')}</h4>
        <p>{t('realityCheck.subtitle')}</p>
        <EmptyState>
          {t('realityCheck.insufficient', {
            nasaCount: nasa.items.length,
            ensoCount: enso.items.length,
            excluded: summary.excludedYears.length,
          })}
        </EmptyState>
      </section>
    );
  }

  const chronologicalYears = sortChronological(summary.years);
  const activeYear =
    selectedYear !== null ? (summary.years.find((y) => y.year === selectedYear) ?? null) : null;
  const activeGroup: RealityPhaseGroup | null =
    selectedPhase !== null ? (summary.groups.find((g) => g.phase === selectedPhase) ?? null) : null;

  const elNinoPreset = findScenarioPreset('el_nino_drier');
  const laNinaPreset = findScenarioPreset('la_nina_wetter');
  const elNinoGroup = summary.groups.find((g) => g.phase === 'el_nino');
  const laNinaGroup = summary.groups.find((g) => g.phase === 'la_nina');

  const elNinoCheck = comparePresetWithObserved(
    elNinoPreset.values.rainfall_change_pct,
    elNinoGroup,
  );
  const laNinaCheck = comparePresetWithObserved(
    laNinaPreset.values.rainfall_change_pct,
    laNinaGroup,
  );

  const fmtMm = (val: number | null) =>
    formatValue(val, 'mm', locale, 0) ?? t('climate.noDataShort');
  const fmtPct = (val: number | null) =>
    val === null ? t('climate.noDataShort') : formatSigned(val, '%', locale);

  return (
    <section aria-labelledby={titleId} className="stack reality-panel">
      <div>
        <h4 id={titleId}>{t('realityCheck.title')}</h4>
        <p>{t('realityCheck.subtitle')}</p>
        <p className="source">
          {t('realityCheck.seasonSummary', {
            years: summary.years.length,
            mean: fmtMm(summary.overallMeanMm),
            excluded: summary.excludedYears.length,
          })}
        </p>
      </div>

      <div className="reality-groups" role="group" aria-label={t('realityCheck.groupsLabel')}>
        {summary.groups.map((group) => {
          const isSelected = selectedPhase === group.phase && activeYear === null;
          const phaseLabel = t(`enso.phase.${group.phase}`);
          const preset = findScenarioPreset(PRESET_FOR_PHASE[group.phase]);
          return (
            <div
              key={group.phase}
              className={`reality-group-card ${isSelected ? 'reality-group-card--selected' : ''}`}
            >
              <button
                type="button"
                className="reality-group-btn"
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedYear(null);
                  setSelectedPhase((prev) => (prev === group.phase ? null : group.phase));
                }}
              >
                <span className="reality-group-title">
                  <span className={`reality-phase-badge reality-phase--${group.phase}`}>
                    {ensoCode(group.phase)}
                  </span>
                  <span>
                    {t('realityCheck.groupTitle', { phase: phaseLabel, count: group.count })}
                  </span>
                </span>
                <span>
                  {t('realityCheck.groupStats', {
                    mean: fmtMm(group.meanMm),
                    diff: fmtPct(group.diffPct),
                  })}
                </span>
                {group.minMm !== null && group.maxMm !== null ? (
                  <span className="source">
                    {t('realityCheck.groupRange', {
                      min: fmtMm(group.minMm),
                      max: fmtMm(group.maxMm),
                    })}
                  </span>
                ) : null}
              </button>
              {onApplyPreset ? (
                <button
                  type="button"
                  className="button button--secondary"
                  aria-label={t('realityCheck.applyAria', { phase: phaseLabel })}
                  onClick={() => onApplyPreset(preset.values)}
                >
                  {t('realityCheck.applyButton')}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="stack">
        <p className="source">{t('realityCheck.stripLabel')}</p>
        <div className="reality-strip-wrap">
          <ul className="reality-strip" aria-label={t('realityCheck.stripLabel')}>
            {chronologicalYears.map((entry) => {
              const active = selectedYear === entry.year;
              const phaseLabel = t(`enso.phase.${entry.phase}`);
              return (
                <li key={entry.year}>
                  <button
                    type="button"
                    className={`reality-year-dot reality-phase--${entry.phase} ${active ? 'reality-year-dot--active' : ''}`}
                    aria-pressed={active}
                    aria-label={t('realityCheck.yearAria', {
                      year: entry.year,
                      phase: phaseLabel,
                      rain: fmtMm(entry.totalRainMm),
                    })}
                    onClick={() => {
                      setSelectedPhase(entry.phase);
                      setSelectedYear((prev) => (prev === entry.year ? null : entry.year));
                    }}
                  >
                    <span>{entry.year}</span>
                    <span>{ensoCode(entry.phase)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="reality-detail" aria-live="polite">
        {activeYear ? (
          <p>
            {t('realityCheck.yearDetail', {
              year: activeYear.year,
              phase: t(`enso.phase.${activeYear.phase}`),
              rain: fmtMm(activeYear.totalRainMm),
              oni:
                activeYear.meanOni !== null
                  ? formatSigned(activeYear.meanOni, '°C', locale)
                  : t('climate.noDataShort'),
              missing: activeYear.missingRainMonths,
            })}
          </p>
        ) : activeGroup ? (
          <p>
            {t('realityCheck.groupDetail', {
              phase: t(`enso.phase.${activeGroup.phase}`),
              count: activeGroup.count,
              mean: fmtMm(activeGroup.meanMm),
              diff: fmtPct(activeGroup.diffPct),
              years: activeGroup.years.map((y) => y.year).join(', '),
            })}
          </p>
        ) : (
          <p>{t('realityCheck.selectPrompt')}</p>
        )}
      </div>

      <div className="reality-preset-check stack">
        <p>
          {t(`realityCheck.presetCheck.${elNinoCheck.verdict}`, {
            presetName: t('realityCheck.presetNames.el_nino_drier'),
            presetRain: formatSigned(elNinoCheck.presetRainPct, '%', locale),
            observed: fmtPct(elNinoCheck.observedDiffPct),
            count: elNinoCheck.sampleSize,
          })}
        </p>
        <p>
          {t(`realityCheck.presetCheck.${laNinaCheck.verdict}`, {
            presetName: t('realityCheck.presetNames.la_nina_wetter'),
            presetRain: formatSigned(laNinaCheck.presetRainPct, '%', locale),
            observed: fmtPct(laNinaCheck.observedDiffPct),
            count: laNinaCheck.sampleSize,
          })}
        </p>
      </div>

      <div>
        <button
          type="button"
          className="button button--secondary"
          aria-expanded={tableOpen}
          aria-controls={tableOpen ? tableId : undefined}
          onClick={() => setTableOpen((open) => !open)}
        >
          {tableOpen ? t('climate.table.hide') : t('climate.table.show')}
        </button>
      </div>

      {tableOpen ? (
        <div id={tableId} className="reality-table-wrap" tabIndex={0}>
          <table className="data-table">
            <caption>{t('realityCheck.table.caption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('realityCheck.table.year')}</th>
                <th scope="col">{t('realityCheck.table.phase')}</th>
                <th scope="col">{t('realityCheck.table.rain')}</th>
                <th scope="col">{t('realityCheck.table.oni')}</th>
              </tr>
            </thead>
            <tbody>
              {chronologicalYears.map((entry) => (
                <tr key={entry.year}>
                  <th scope="row">{entry.year}</th>
                  <td>{t(`enso.phase.${entry.phase}`)}</td>
                  <td>{fmtMm(entry.totalRainMm)}</td>
                  <td>
                    {entry.meanOni !== null
                      ? formatSigned(entry.meanOni, '°C', locale)
                      : t('climate.noDataShort')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="source stack">
        <p>{t('realityCheck.limitations')}</p>
        <p>
          {t('realityCheck.sources', {
            nasaSource: nasa.source,
            ensoSource: enso.source,
          })}
        </p>
        <p>{nasa.disclaimer}</p>
      </div>
    </section>
  );
}
