import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelErrorState, PanelLoadingState } from '../../../components/PanelState';
import {
  DEFAULT_PRIORITIES,
  EQUIPMENT_TYPES,
  PRIORITY_PRESETS,
  WATER_AVAILABILITY,
  fromSliderValue,
  matchingPriorityPresetId,
  toSliderValue,
  validatePriorities,
  type EquipmentType,
  type Priorities,
  type PriorityPreset,
  type WaterAvailability,
} from '../../../domain/priorities';
import { PRIORITY_KEYS, type PriorityKey } from '../../../domain/strategies';
import { savePriorities } from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import { usePriorities } from '../hooks/usePriorities';
import '../rotations.css';

type Status = 'idle' | 'saving' | 'saved' | 'error' | 'reset';

function WeightSlider({
  priority,
  value,
  onChange,
}: {
  priority: PriorityKey;
  value: number;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const text = t('priorities.valueText', { value });
  return (
    <div className="field slider">
      <div className="slider-head">
        <label htmlFor={id}>{t(`rotations.priority.${priority}`)}</label>
        <output htmlFor={id}>{text}</output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        aria-valuetext={text}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span id={`${id}-hint`} className="slider-hint">
        {t(`priorities.weights.${priority}.hint`)} {t('priorities.scale')}
      </span>
    </div>
  );
}

function Fields({
  farmId,
  initial,
  onSaved,
}: {
  farmId: string;
  initial: Priorities;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const { client } = useApi();
  const waterId = useId();
  const [draft, setDraft] = useState<Priorities>(initial);
  const [status, setStatus] = useState<Status>('idle');

  const edit = (next: Priorities) => {
    setDraft(next);
    setStatus('idle');
  };

  const toggleEquipment = (item: EquipmentType) => {
    const current = draft.constraints.equipment;
    const equipment = EQUIPMENT_TYPES.filter((type) =>
      type === item ? !current.includes(type) : current.includes(type),
    );
    edit({ ...draft, constraints: { ...draft.constraints, equipment } });
  };

  const persist = async (next: Priorities) => {
    if (validatePriorities(next).length > 0) {
      setStatus('error');
      return;
    }
    setStatus('saving');
    try {
      await savePriorities(client, farmId, next);
      setStatus('saved');
      onSaved?.();
    } catch {
      setStatus('error');
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await persist(draft);
  };

  const applyPreset = async (preset: PriorityPreset) => {
    const next: Priorities = {
      ...draft,
      weights: { ...preset.weights },
    };
    setDraft(next);
    await persist(next);
  };

  const activePreset = matchingPriorityPresetId(draft.weights);

  return (
    <form className="stack" onSubmit={onSubmit} aria-busy={status === 'saving'}>
      <div className="priority-presets" role="group" aria-label={t('priorities.presets.label')}>
        <p className="priority-presets-label">{t('priorities.presets.label')}</p>
        <div className="priority-presets-row">
          {PRIORITY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`priority-preset-btn ${activePreset === preset.id ? 'priority-preset-btn--active' : ''}`}
              aria-pressed={activePreset === preset.id}
              disabled={status === 'saving'}
              onClick={() => void applyPreset(preset)}
            >
              {t(`priorities.presets.${preset.id}`)}
            </button>
          ))}
        </div>
      </div>
      <fieldset className="stack">
        <legend>{t('priorities.weightsLegend')}</legend>
        <div className="controls controls--sliders">
          {PRIORITY_KEYS.map((key) => (
            <WeightSlider
              key={key}
              priority={key}
              value={toSliderValue(draft.weights[key])}
              onChange={(value) =>
                edit({ ...draft, weights: { ...draft.weights, [key]: fromSliderValue(value) } })
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="stack">
        <legend>{t('priorities.constraintsLegend')}</legend>
        <div className="field">
          <label htmlFor={waterId}>{t('priorities.water.label')}</label>
          <select
            id={waterId}
            value={draft.constraints.water_availability}
            aria-describedby={`${waterId}-hint`}
            onChange={(event) =>
              edit({
                ...draft,
                constraints: {
                  ...draft.constraints,
                  water_availability: event.target.value as WaterAvailability,
                },
              })
            }
          >
            {WATER_AVAILABILITY.map((level) => (
              <option key={level} value={level}>
                {t(`priorities.water.${level}`)}
              </option>
            ))}
          </select>
          <span id={`${waterId}-hint`} className="slider-hint">
            {t('priorities.water.hint')}
          </span>
        </div>
        <fieldset className="field">
          <legend>{t('priorities.equipment.legend')}</legend>
          <p className="slider-hint">{t('priorities.equipment.hint')}</p>
          {EQUIPMENT_TYPES.map((item) => (
            <label key={item} className="check">
              <input
                type="checkbox"
                checked={draft.constraints.equipment.includes(item)}
                onChange={() => toggleEquipment(item)}
              />{' '}
              {t(`priorities.equipment.${item}`)}
            </label>
          ))}
        </fieldset>
      </fieldset>

      <div className="toolbar">
        <button type="submit" className="button" disabled={status === 'saving'}>
          {status === 'saving' ? t('priorities.saving') : t('priorities.save')}
        </button>
        <button
          type="button"
          className="button button--secondary"
          disabled={status === 'saving'}
          onClick={() => {
            setDraft(structuredClone(DEFAULT_PRIORITIES));
            setStatus('reset');
          }}
        >
          {t('priorities.reset')}
        </button>
      </div>
      {status === 'saved' ? (
        <p role="status" className="state state--empty">
          {t('priorities.saved')}
        </p>
      ) : null}
      {status === 'reset' ? (
        <p role="status" className="state state--empty">
          {t('priorities.resetDone')}
        </p>
      ) : null}
      {status === 'error' ? (
        <p role="alert" className="state state--error">
          {t('priorities.saveError')}
        </p>
      ) : null}
    </form>
  );
}

/** Farmer priorities and constraints, loaded and saved per farm. */
export function PrioritiesForm({ farmId, onSaved }: { farmId: string; onSaved?: () => void }) {
  const { t } = useTranslation();
  const { resource, reload } = usePriorities(farmId);

  let body;
  if (resource.status === 'error')
    body = <PanelErrorState error={resource.error} onRetry={reload} />;
  else if (resource.status === 'loading')
    body = <PanelLoadingState label={t('priorities.loading')} />;
  else body = <Fields farmId={farmId} initial={resource.data} onSaved={onSaved} />;

  const jumpToComparison = () => {
    const target = document.getElementById('rotations-title');
    if (target) {
      target.focus();
      target.scrollIntoView?.({ behavior: 'smooth' });
    }
  };

  return (
    <section aria-labelledby="priorities-title" className="card stack">
      <div>
        <div className="rotations-header-row">
          <h3 id="priorities-title" tabIndex={-1}>
            {t('priorities.title')}
          </h3>
          <button type="button" className="button button--secondary" onClick={jumpToComparison}>
            {t('priorities.jumpToComparison')}
          </button>
        </div>
        <p>{t('priorities.intro')}</p>
        <p className="source">{t('priorities.starting')}</p>
        <p className="source">{t('priorities.decision')}</p>
      </div>
      {body}
    </section>
  );
}
