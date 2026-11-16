import { DEFAULT_SCENARIO, type ScenarioValues } from './scenario';

export type ScenarioPresetId = 'el_nino_drier' | 'la_nina_wetter' | 'heatwave' | 'normal';

export interface ScenarioPreset {
  id: ScenarioPresetId;
  values: ScenarioValues;
}

/**
 * Curated one-click presets within contract limits for quick exploration.
 * Values represent illustrative seasonal anomalies (not forecasts).
 */
export const SCENARIO_PRESETS: readonly ScenarioPreset[] = [
  {
    id: 'el_nino_drier',
    values: { rainfall_change_pct: -20, temperature_change_c: 1.5, enso_phase: 'el_nino' },
  },
  {
    id: 'la_nina_wetter',
    values: { rainfall_change_pct: 25, temperature_change_c: -0.5, enso_phase: 'la_nina' },
  },
  {
    id: 'heatwave',
    values: { rainfall_change_pct: -10, temperature_change_c: 3.5, enso_phase: 'neutral' },
  },
  {
    id: 'normal',
    values: { ...DEFAULT_SCENARIO },
  },
];

export function findScenarioPreset(id: ScenarioPresetId): ScenarioPreset {
  return SCENARIO_PRESETS.find((preset) => preset.id === id) ?? SCENARIO_PRESETS[3];
}
