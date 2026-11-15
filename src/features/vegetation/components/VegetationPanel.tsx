import { useCallback, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '../../../components/AsyncState';
import { humanizeId } from '../../../domain/months';
import { useApi } from '../../../services/ApiContext';
import type { ScenarioInput } from '../../../services/types';
import { useAsyncResource } from '../../../services/useAsyncResource';
import { simulateVegetation } from '../../../services/vegetation';

type Props = { farmId: string; scenario: ScenarioInput };
function Outlook({ farmId, scenario }: Props) {
  const { t } = useTranslation();
  const { client } = useApi();
  const { rainfall_change_pct: rain, temperature_change_c: temp, enso_phase: enso } = scenario;
  const load = useCallback(
    (signal: AbortSignal) =>
      simulateVegetation(
        client,
        farmId,
        { rainfall_change_pct: rain, temperature_change_c: temp, enso_phase: enso },
        signal,
      ),
    [client, farmId, rain, temp, enso],
  );
  const { resource, reload } = useAsyncResource(load);
  if (resource.status === 'loading') return <LoadingState label={t('vegetation.loading')} />;
  if (resource.status === 'error') return <ErrorState error={resource.error} onRetry={reload} />;
  const result = resource.data;
  const v = result.validation;
  return (
    <div className="stack">
      <p className="state state--warning">
        {t('vegetation.validation', {
          skill: v.skill_improvement_pct,
          goal: v.required_improvement_pct,
          coverage: (v.interval_coverage * 100).toFixed(1),
          correlation: v.annual_mean_correlation,
          years: v.years,
        })}
      </p>
      <div className="data-table-wrap">
        <table>
          <caption>{t('vegetation.caption')}</caption>
          <thead>
            <tr>
              <td />
              <th scope="col">{t('vegetation.low')}</th>
              <th scope="col">{t('vegetation.mid')}</th>
              <th scope="col">{t('vegetation.high')}</th>
            </tr>
          </thead>
          <tbody>
            {(['baseline', 'scenario'] as const).map((key) => (
              <tr key={key}>
                <th scope="row">{t(`vegetation.${key}`)}</th>
                {(['p10', 'p50', 'p90'] as const).map((q) => (
                  <td key={q}>{result[key][q].toFixed(2)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        {t('vegetation.cell', {
          cell: result.reference_cell.cell_id,
          distance: result.reference_cell.distance_km.toFixed(1),
        })}
      </p>
      {result.out_of_range_inputs.length > 0 ? (
        <p className="state state--warning">
          {t('vegetation.outside', {
            inputs: result.out_of_range_inputs.map(humanizeId).join(', '),
          })}
        </p>
      ) : null}
      <h4>{t('vegetation.attributions')}</h4>
      <p>{t('vegetation.explanation')}</p>
      <ul>
        {[...result.attributions]
          .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
          .slice(0, 5)
          .map((a) => (
            <li key={a.feature}>
              {humanizeId(a.feature)}
              {': '}
              {a.contribution.toFixed(2)}
            </li>
          ))}
      </ul>
      <p>{t('vegetation.delta', { delta: result.explained_median_delta.toFixed(2) })}</p>
      <details>
        <summary>{t('vegetation.limits')}</summary>
        <ul>
          {result.limitations.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </details>
      <p className="source">{result.provenance.model_version}</p>
      <p>{result.disclaimer}</p>
    </div>
  );
}
export function VegetationPanel(props: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [active, setActive] = useState(false);
  return (
    <section className="card stack" aria-labelledby={id}>
      <h3 id={id}>{t('vegetation.title')}</h3>
      <p>{t('vegetation.intro')}</p>
      {active ? (
        <Outlook {...props} />
      ) : (
        <button type="button" className="button" onClick={() => setActive(true)}>
          {t('vegetation.run')}
        </button>
      )}
    </section>
  );
}
