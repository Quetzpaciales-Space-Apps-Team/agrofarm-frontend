import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlossaryTerm } from '../../../components/GlossaryTerm';
import {
  PanelEmptyState,
  PanelErrorState,
  PanelLoadingState,
} from '../../../components/PanelState';
import { summarizeClimatePeriod, type ClimateRow } from '../../../domain/chart';
import { ensoCells } from '../../../domain/enso';
import {
  defaultRange,
  formatMonth,
  formatValue,
  monthsInRange,
  type MonthRange,
} from '../../../domain/months';
import { useClimate } from '../hooks/useClimate';
import { ClimateChart } from './ClimateChart';
import { ClimateLegend } from './ClimateLegend';
import { ClimateTable } from './ClimateTable';
import { EnsoStrip } from './EnsoStrip';
import '../climate.css';

const DEFAULT_MONTHS = 24;

export function ClimatePanel() {
  const { t, i18n } = useTranslation();
  const { resource, reload } = useClimate();
  const [chosen, setChosen] = useState<MonthRange | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [showEnso, setShowEnso] = useState(true);
  const tableId = useId();
  const summaryId = useId();

  if (resource.status === 'loading') return <PanelLoadingState label={t('climate.loading')} />;
  if (resource.status === 'error')
    return <PanelErrorState error={resource.error} onRetry={reload} />;

  const { nasa, enso } = resource.data;
  const allMonths = nasa.items.map((item) => item.month);
  const fallback = defaultRange(allMonths, DEFAULT_MONTHS);
  if (!fallback) {
    return (
      <section aria-labelledby="climate-title" className="card">
        <h3 id="climate-title">{t('climate.title')}</h3>
        <PanelEmptyState>{t('climate.empty')}</PanelEmptyState>
      </section>
    );
  }

  const range = chosen ?? fallback;
  const visible = new Set(monthsInRange(allMonths, range));
  const rows: ClimateRow[] = nasa.items.filter((item) => visible.has(item.month));
  const months = rows.map((row) => row.month);
  const sortedMonths = [...allMonths].sort();
  const chartEnso = ensoCells(months, enso.items);
  const periodSummary = summarizeClimatePeriod(rows, enso.items);
  const locale = i18n.language;

  const missing = rows
    .map((row) => ({
      month: row.month,
      series: (
        [
          ['rainfall_mm', row.rainfall_mm],
          ['temperature_mean_c', row.temperature_mean_c],
          ['temperature_min_c', row.temperature_min_c],
          ['temperature_max_c', row.temperature_max_c],
        ] as const
      )
        .filter(([, value]) => value === null)
        .map(([key]) => t(`climate.series.${key}`)),
    }))
    .filter((entry) => entry.series.length > 0);
  const list = new Intl.ListFormat(i18n.language, { style: 'long', type: 'conjunction' });

  const monthSelect = (label: string, name: 'start' | 'end') => (
    <div className="field">
      <label htmlFor={`${tableId}-${name}`}>{label}</label>
      <select
        id={`${tableId}-${name}`}
        value={range[name]}
        onChange={(event) => {
          const value = event.target.value;
          setChosen(
            name === 'start'
              ? { start: value, end: value > range.end ? value : range.end }
              : { start: value < range.start ? value : range.start, end: value },
          );
        }}
      >
        {sortedMonths.map((month) => (
          <option key={month} value={month}>
            {formatMonth(month, i18n.language)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section aria-labelledby="climate-title" className="card climate">
      <div className="span-all">
        <h3 id="climate-title">{t('climate.title')}</h3>
        <p>{t('climate.intro')}</p>
        <div className="controls">
          {monthSelect(t('climate.from'), 'start')}
          {monthSelect(t('climate.to'), 'end')}
          <label className="climate-toggle">
            <input
              type="checkbox"
              checked={showEnso}
              onChange={(event) => setShowEnso(event.target.checked)}
            />
            {t('climate.showEnso')}
          </label>
        </div>
      </div>

      <div>
        <div className="chart-box">
          <ClimateChart rows={rows} enso={chartEnso} showEnso={showEnso} />
        </div>
        <ClimateLegend showEnso={showEnso} />
        <section aria-labelledby={summaryId} className="climate-summary-card">
          <h4 id={summaryId}>{t('climate.summary.title')}</h4>
          <dl className="climate-summary-grid">
            <div>
              <dt>{t('climate.summary.wettest')}</dt>
              <dd>
                {periodSummary.wettest
                  ? t('climate.summary.monthValue', {
                      month: formatMonth(periodSummary.wettest.month, locale),
                      value: formatValue(periodSummary.wettest.rainfall_mm, 'mm', locale, 0),
                    })
                  : t('climate.noData')}
              </dd>
            </div>
            <div>
              <dt>{t('climate.summary.driest')}</dt>
              <dd>
                {periodSummary.driest
                  ? t('climate.summary.monthValue', {
                      month: formatMonth(periodSummary.driest.month, locale),
                      value: formatValue(periodSummary.driest.rainfall_mm, 'mm', locale, 0),
                    })
                  : t('climate.noData')}
              </dd>
            </div>
            <div>
              <dt>{t('climate.summary.totalRain')}</dt>
              <dd>
                {periodSummary.totalRainMm !== null
                  ? formatValue(periodSummary.totalRainMm, 'mm', locale, 0)
                  : t('climate.noData')}
              </dd>
            </div>
            <div>
              <dt>{t('climate.summary.meanTemp')}</dt>
              <dd>
                {periodSummary.meanTempC !== null
                  ? formatValue(periodSummary.meanTempC, '°C', locale, 1)
                  : t('climate.noData')}
              </dd>
            </div>
          </dl>
          <p className="source">
            {t('climate.summary.ensoCoincidence', {
              months: periodSummary.months,
              elNino: periodSummary.elNinoMonths,
              laNina: periodSummary.laNinaMonths,
            })}
          </p>
        </section>
        <h4>{t('climate.missing.title')}</h4>
        {missing.length === 0 ? (
          <p>{t('climate.missing.none')}</p>
        ) : (
          <ul className="no-data-list" aria-label={t('climate.missing.title')}>
            {missing.map((entry) => (
              <li key={entry.month}>
                {t('climate.missing.item', {
                  month: formatMonth(entry.month, i18n.language),
                  series: list.format(entry.series),
                })}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="button button--secondary"
          aria-expanded={tableOpen}
          aria-controls={tableOpen ? tableId : undefined}
          onClick={() => setTableOpen((open) => !open)}
        >
          {tableOpen ? t('climate.table.hide') : t('climate.table.show')}
        </button>
        {tableOpen ? <ClimateTable rows={rows} id={tableId} /> : null}
      </div>

      <section aria-labelledby="source-title" className="source">
        <h4 id="source-title">{t('climate.source.title')}</h4>
        <dl>
          <dt>{t('climate.source.dataset')}</dt>
          <dd>
            {nasa.source} (
            <a href={nasa.source_url} rel="noopener noreferrer">
              {t('climate.source.link')}
            </a>
            )
          </dd>
          <dt>{t('climate.source.attribution')}</dt>
          <dd>{nasa.attribution}</dd>
          <dt>{t('climate.source.resolution')}</dt>
          <dd>
            {nasa.resolution_note}{' '}
            <GlossaryTerm term="reanalysis" label={t('glossary.terms.reanalysis.label')} />
          </dd>
          <dt>{t('climate.source.disclaimer')}</dt>
          <dd>{nasa.disclaimer}</dd>
        </dl>
      </section>

      <div className="span-all">
        <EnsoStrip
          months={months}
          items={enso.items}
          source={enso.source}
          threshold={enso.threshold_c}
        />
      </div>
    </section>
  );
}
