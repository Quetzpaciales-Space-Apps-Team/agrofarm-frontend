import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '../../../components/AsyncState';
import { ProvenanceBlock } from '../../../components/ProvenanceBlock';
import { formatSigned, sortAttributions } from '../../../domain/scenario';
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
      <p className="source">{t('simulation.chart.help')}</p>

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

  if (resource.status === 'error') return <ErrorState error={resource.error} onRetry={reload} />;
  if (resource.status === 'success') return <Result result={resource.data} busy={false} />;
  if (stale) return <Result result={stale} busy />;
  return <LoadingState label={t('simulation.loading')} />;
}
