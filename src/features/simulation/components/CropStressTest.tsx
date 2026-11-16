import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../../../components/AsyncState';
import { humanizeId } from '../../../domain/months';
import { formatSigned } from '../../../domain/scenario';
import { SCENARIO_PRESETS, type ScenarioPresetId } from '../../../domain/scenarioPresets';
import {
  STRESS_TEST_CROPS,
  analyzeStressMatrix,
  type StressCellData,
} from '../../../domain/stressTest';
import { useStressTest } from '../hooks/useStressTest';
import '../stressTest.css';

function symbolFor(p50: number): string {
  if (p50 < 0) return '▼';
  if (p50 > 0) return '▲';
  return '●';
}

function toneClass(p50: number): string {
  if (p50 < 0) return 'stress-cell--down';
  if (p50 > 0) return 'stress-cell--up';
  return 'stress-cell--neutral';
}

export function CropStressTest({ farmId }: { farmId: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const titleId = useId();
  const { status, completed, total, entries, error, run, cancel } = useStressTest(farmId);

  const byKey = new Map(entries.map((item) => [`${item.crop}:${item.presetId}`, item.result]));
  const cellData: StressCellData[] = entries.map((item) => ({
    crop: item.crop,
    presetId: item.presetId,
    p10: item.result.scenario.p10,
    p50: item.result.scenario.p50,
    p90: item.result.scenario.p90,
  }));
  const matrixSummary = analyzeStressMatrix(cellData);

  const firstResult = entries[0]?.result;
  const summaryLine = (() => {
    if (!matrixSummary.worstOverall || entries.length === 0) return null;
    const worst = matrixSummary.worstOverall;
    const baseText = t('stressTest.summaryWorst', {
      crop: humanizeId(worst.crop),
      scenario: t(`stressTest.presets.${worst.presetId}`),
      median: formatSigned(worst.p50, firstResult?.unit ?? '%', locale),
    });
    const note = matrixSummary.allCropsEqual
      ? t('stressTest.summaryEqual')
      : t('stressTest.summaryDiffers');
    return `${baseText} ${note}`;
  })();

  return (
    <section aria-labelledby={titleId} className="stack stress-panel">
      <div>
        <h4 id={titleId}>{t('stressTest.title')}</h4>
        <p>{t('stressTest.intro')}</p>
      </div>

      <p className="state state--warning">
        {firstResult
          ? t('stressTest.caveatWithModel', {
              model: firstResult.provenance.model_name,
              version: firstResult.provenance.model_version,
            })
          : t('stressTest.caveat')}
      </p>

      <div className="stress-actions">
        <button
          type="button"
          className="button"
          disabled={status === 'running'}
          onClick={() => void run()}
        >
          {t('stressTest.run')}
        </button>
        {status === 'running' ? (
          <button type="button" className="button button--secondary" onClick={cancel}>
            {t('common.cancel')}
          </button>
        ) : null}
        <span role="status" aria-live="polite">
          {status === 'running'
            ? t('stressTest.progress', { completed, total })
            : status === 'cancelled'
              ? t('stressTest.cancelled', { completed, total })
              : null}
        </span>
      </div>

      {status === 'error' && error ? <ErrorState error={error} onRetry={() => void run()} /> : null}

      {summaryLine ? (
        <p className="scenario-summary" aria-live="polite">
          {summaryLine}
        </p>
      ) : null}

      {entries.length > 0 ? (
        <div className="stress-table-wrap" tabIndex={0}>
          <table className="stress-table">
            <caption>{t('stressTest.tableCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('stressTest.cropCol')}</th>
                {SCENARIO_PRESETS.map((preset) => (
                  <th key={preset.id} scope="col">
                    {t(`stressTest.presets.${preset.id}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STRESS_TEST_CROPS.map((crop) => {
                const worstPreset: ScenarioPresetId | undefined =
                  matrixSummary.worstByCrop.get(crop);
                return (
                  <tr key={crop}>
                    <th scope="row">{humanizeId(crop)}</th>
                    {SCENARIO_PRESETS.map((preset) => {
                      const res = byKey.get(`${crop}:${preset.id}`);
                      if (!res) {
                        return <td key={preset.id}>{t('stressTest.pendingCell')}</td>;
                      }
                      const { p10, p50, p90 } = res.scenario;
                      const isWorst = worstPreset === preset.id;
                      const isBest = matrixSummary.bestByScenario.get(preset.id) === crop;
                      return (
                        <td key={preset.id} className={toneClass(p50)}>
                          <div className="stress-cell">
                            <span className="stress-cell-median">
                              <span aria-hidden="true">{symbolFor(p50)} </span>
                              {formatSigned(p50, res.unit, locale)}
                            </span>
                            <span className="stress-cell-range">
                              {t('stressTest.rangeCell', {
                                low: formatSigned(p10, res.unit, locale),
                                high: formatSigned(p90, res.unit, locale),
                              })}
                            </span>
                            {isWorst ? (
                              <span className="stress-tag stress-tag--worst">
                                {t('stressTest.worstForCrop')}
                              </span>
                            ) : null}
                            {isBest ? (
                              <span className="stress-tag stress-tag--best">
                                {t('stressTest.mostResilient')}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {firstResult?.disclaimer ? <p className="source">{firstResult.disclaimer}</p> : null}
    </section>
  );
}
