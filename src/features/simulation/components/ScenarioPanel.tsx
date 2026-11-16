import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, LoadingState } from '../../../components/AsyncState';
import { humanizeId } from '../../../domain/months';
import { ENSO_PHASES, SCENARIO_LIMITS, formatSigned } from '../../../domain/scenario';
import { useFarm } from '../../farms/hooks/useFarm';
import { useScenario } from '../state/scenario';
import { ClimateRealityCheck } from './ClimateRealityCheck';
import { SimulationResults } from './SimulationResults';

interface SliderProps {
  label: string;
  hint: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  locale: string;
  onChange: (value: number) => void;
}

function Slider({ label, hint, unit, value, min, max, step, locale, onChange }: SliderProps) {
  const id = useId();
  const text = formatSigned(value, unit, locale);
  return (
    <div className="field slider">
      <div className="slider-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{text}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={text}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span id={`${id}-hint`} className="slider-hint">
        {hint}
      </span>
    </div>
  );
}

export function ScenarioPanel({ farmId }: { farmId: string }) {
  const { t, i18n } = useTranslation();
  const { resource, reload } = useFarm(farmId);
  const { scenario, debounced, update, reset } = useScenario();
  const selectId = useId();
  const locale = i18n.language;

  if (resource.status === 'loading') return <LoadingState label={t('scenario.loading')} />;
  if (resource.status === 'error') return <ErrorState error={resource.error} onRetry={reload} />;

  const crops = resource.data.current_rotation.filter((crop) => crop !== 'fallow');
  const crop = scenario.crop && crops.includes(scenario.crop) ? scenario.crop : (crops[0] ?? null);
  const debouncedCrop =
    debounced.crop && crops.includes(debounced.crop) ? debounced.crop : (crops[0] ?? null);
  const { rainfall, temperature } = SCENARIO_LIMITS;
  const range = (min: number, max: number, unit: string) =>
    t('scenario.range', {
      min: formatSigned(min, unit, locale),
      max: formatSigned(max, unit, locale),
    });

  return (
    <section aria-labelledby="scenario-title" className="card stack">
      <div>
        <h3 id="scenario-title">{t('scenario.title')}</h3>
        <p>{t('scenario.intro')}</p>
      </div>
      {crop === null ? (
        <EmptyState>{t('scenario.noCrops')}</EmptyState>
      ) : (
        <>
          <div className="controls controls--sliders">
            <Slider
              label={t('scenario.rainfall')}
              hint={range(rainfall.min, rainfall.max, '%')}
              unit="%"
              value={scenario.rainfall_change_pct}
              {...rainfall}
              locale={locale}
              onChange={(value) => update({ rainfall_change_pct: value })}
            />
            <Slider
              label={t('scenario.temperature')}
              hint={range(temperature.min, temperature.max, '°C')}
              unit="°C"
              value={scenario.temperature_change_c}
              {...temperature}
              locale={locale}
              onChange={(value) => update({ temperature_change_c: value })}
            />
            <div className="field">
              <label htmlFor={`${selectId}-enso`}>{t('scenario.enso')}</label>
              <select
                id={`${selectId}-enso`}
                value={scenario.enso_phase}
                onChange={(event) =>
                  update({ enso_phase: event.target.value as typeof scenario.enso_phase })
                }
              >
                {ENSO_PHASES.map((phase) => (
                  <option key={phase} value={phase}>
                    {t(`enso.phase.${phase}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${selectId}-crop`}>{t('scenario.crop')}</label>
              <select
                id={`${selectId}-crop`}
                value={crop}
                onChange={(event) => update({ crop: event.target.value })}
              >
                {crops.map((name) => (
                  <option key={name} value={name}>
                    {humanizeId(name)}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="button button--secondary" onClick={reset}>
              {t('scenario.reset')}
            </button>
          </div>
          {debouncedCrop ? (
            <SimulationResults
              farmId={farmId}
              crop={debouncedCrop}
              scenario={{
                rainfall_change_pct: debounced.rainfall_change_pct,
                temperature_change_c: debounced.temperature_change_c,
                enso_phase: debounced.enso_phase,
              }}
            />
          ) : null}
        </>
      )}
      <ClimateRealityCheck onApplyPreset={update} />
    </section>
  );
}
