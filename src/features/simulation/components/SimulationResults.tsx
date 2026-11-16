import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { GlossaryTerm } from '../../../components/GlossaryTerm';
import { PanelErrorState, PanelLoadingState } from '../../../components/PanelState';
import { ProvenanceBlock } from '../../../components/ProvenanceBlock';
import {
  classifyScenarioOutcome,
  formatSigned,
  isStubModel,
  sortAttributions,
} from '../../../domain/scenario';
import { formatValue, humanizeId } from '../../../domain/months';
import type { ScenarioInput, SimulationResult } from '../../../services/types';
import { useSimulation } from '../hooks/useSimulation';
import { RangeChart } from './RangeChart';

function Result({ result, busy }: { result: SimulationResult; busy: boolean }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const fmt = (value: number) => formatValue(value, result.unit, locale, 1) ?? '';
  const attributions = sortAttributions(result.attributions);
  const label = (prefix: string, id: string) =>
    t(`${prefix}.${id}`, { defaultValue: humanizeId(id) });
  const biggest = Math.max(0.0001, ...attributions.map((a) => Math.abs(a.contribution)));
  const outcome = classifyScenarioOutcome(result.scenario);
  const cropName = humanizeId(result.crop).toLowerCase();
  const midText = formatSigned(result.scenario.p50, result.unit, locale);
  const lowText = formatSigned(result.scenario.p10, result.unit, locale);
  const highText = formatSigned(result.scenario.p90, result.unit, locale);
  const summaryText =
    outcome === 'neutral'
      ? t('simulation.summary.neutral', { crop: cropName, mid: midText })
      : outcome === 'mixed'
        ? t('simulation.summary.mixed', {
            crop: cropName,
            low: lowText,
            high: highText,
            mid: midText,
          })
        : t('simulation.summary.directional', {
            crop: cropName,
            low: lowText,
            high: highText,
            mid: midText,
          });
  const stub = isStubModel(result.provenance.model_name);
  const headingId = useId();
  const low = result.scenario.p10;
  const mid = result.scenario.p50;
  const high = result.scenario.p90;
  const axis = Math.max(1, Math.abs(low), Math.abs(high));
  const position = (value: number) => ((value + axis) / (2 * axis)) * 100;

  return (
    <div className="stack" aria-busy={busy}>
      {busy ? (
        <p role="status" className="state state--loading">
          {t('simulation.updating')}
        </p>
      ) : null}
      {result.out_of_range_inputs.length > 0 ? (
        <div role="alert" className="state state--warning">
          <p>{t('simulation.outOfRange')}</p>
          <ul className="plain-list">
            {result.out_of_range_inputs.map((input) => (
              <li key={input}>{label('simulation.input', input)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className={`insight insight--${outcome}`} aria-labelledby={`${headingId}-insight`}>
        <h4 id={`${headingId}-insight`}>
          {t(`simulation.insight.headline.${outcome}`, { crop: humanizeId(result.crop) })}
        </h4>
        <dl className="insight__figures">
          <div className="insight__figure insight__figure--low">
            <dt>{t('simulation.insight.low')}</dt>
            <dd>{lowText}</dd>
          </div>
          <div className="insight__figure insight__figure--mid">
            <dt>{t('simulation.insight.mid')}</dt>
            <dd>{midText}</dd>
          </div>
          <div className="insight__figure insight__figure--high">
            <dt>{t('simulation.insight.high')}</dt>
            <dd>{highText}</dd>
          </div>
        </dl>
        <div className="insight__bar" role="img" aria-label={t('simulation.insight.barLabel')}>
          <span
            className="insight__band"
            style={{ left: `${position(low)}%`, width: `${position(high) - position(low)}%` }}
          />
          <span className="insight__zero" />
          <span className="insight__mid" style={{ left: `${position(mid)}%` }} />
        </div>
        <p className="scenario-summary" aria-live="polite">
          {summaryText}
        </p>
      </section>
      <div className="simulation-provenance-bar">
        <span>
          {t('simulation.provenanceBar.model', {
            name: result.provenance.model_name,
            version: result.provenance.model_version,
          })}
        </span>
        {stub ? (
          <span className="simulation-provenance-note">
            {t('simulation.provenanceBar.stubNote')}
          </span>
        ) : null}
      </div>
      {result.disclaimer ? <p className="simulation-disclaimer">{result.disclaimer}</p> : null}

      <p>
        {t('simulation.target.intro', {
          target: label('simulation.target', result.target),
          unit: result.unit,
          crop: humanizeId(result.crop),
        })}
      </p>
      <div className="chart-box">
        <RangeChart baseline={result.baseline} scenario={result.scenario} unit={result.unit} />
      </div>
      <p className="source">
        {t('simulation.chart.help')}{' '}
        <GlossaryTerm term="percentile" label={t('glossary.terms.percentile.label')} />
      </p>

      <div className="data-table-wrap">
        <table>
          <caption>{t('simulation.table.caption', { unit: result.unit })}</caption>
          <thead>
            <tr>
              <td />
              <th scope="col">{t('simulation.table.low')}</th>
              <th scope="col">{t('simulation.table.mid')}</th>
              <th scope="col">{t('simulation.table.high')}</th>
            </tr>
          </thead>
          <tbody>
            {(['baseline', 'scenario'] as const).map((key) => (
              <tr key={key}>
                <th scope="row">{t(`simulation.${key}`)}</th>
                <td>{fmt(result[key].p10)}</td>
                <td>{fmt(result[key].p50)}</td>
                <td>{fmt(result[key].p90)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>{t('simulation.attributions.title')}</h4>
      <p className="source">{t('simulation.attributions.help')}</p>
      <ul className="attributions" aria-label={t('simulation.attributions.title')}>
        {attributions.map((item) => (
          <li key={item.feature}>
            <span className="attribution-name">{label('simulation.feature', item.feature)}</span>
            <span className="attribution-bar" aria-hidden="true">
              <span
                className={`attribution-fill ${item.contribution < 0 ? 'attribution-fill--down' : 'attribution-fill--up'}`}
                style={{ width: `${(Math.abs(item.contribution) / biggest) * 100}%` }}
              />
            </span>
            <span className="attribution-value">
              {formatSigned(item.contribution, result.unit, locale)}{' '}
              {item.contribution < 0
                ? t('simulation.attributions.lowers')
                : item.contribution > 0
                  ? t('simulation.attributions.raises')
                  : t('simulation.attributions.noEffect')}
            </span>
          </li>
        ))}
      </ul>

      <ProvenanceBlock provenance={result.provenance} disclaimer={result.disclaimer} />
    </div>
  );
}

export function SimulationResults({
  farmId,
  crop,
  scenario,
}: {
  farmId: string;
  crop: string;
  scenario: ScenarioInput;
}) {
  const { t } = useTranslation();
  const { resource, reload, stale } = useSimulation(farmId, crop, scenario);

  if (resource.status === 'error')
    return <PanelErrorState error={resource.error} onRetry={reload} />;
  if (resource.status === 'success') return <Result result={resource.data} busy={false} />;
  if (stale) return <Result result={stale} busy />;
  return <PanelLoadingState label={t('simulation.loading')} />;
}
