import { linearScale, niceTicks } from './chart';
import type { EnsoPhase } from './enso';

export interface ScenarioValues {
  rainfall_change_pct: number;
  temperature_change_c: number;
  enso_phase: EnsoPhase;
}

/** Slider limits from the core-api contract (`Scenario`). */
export const SCENARIO_LIMITS = {
  rainfall: { min: -80, max: 100, step: 5 },
  temperature: { min: -5, max: 8, step: 0.5 },
} as const;

export const DEFAULT_SCENARIO: ScenarioValues = {
  rainfall_change_pct: 0,
  temperature_change_c: 0,
  enso_phase: 'neutral',
};

export const ENSO_PHASES: EnsoPhase[] = ['neutral', 'el_nino', 'la_nina'];

export type ScenarioPresetId = 'el_nino_drier' | 'la_nina_wetter' | 'heatwave' | 'normal';

export interface ScenarioPreset {
  id: ScenarioPresetId;
  values: ScenarioValues;
}

/**
 * Curated one-click presets within contract limits for quick exploration.
 * Values represent illustrative seasonal anomalies (not forecasts):
 * - El Nino: drier (-20 % rain) and warmer (+1.5 C)
 * - La Nina: wetter (+25 % rain) and slightly cooler (-0.5 C)
 * - Heatwave: hotter (+3.5 C) and moderately drier (-10 % rain)
 * - Normal: baseline reset (0 %, 0 C, neutral)
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

export function matchingPresetId(values: ScenarioValues): ScenarioPresetId | null {
  const match = SCENARIO_PRESETS.find(
    (preset) =>
      preset.values.rainfall_change_pct === values.rainfall_change_pct &&
      preset.values.temperature_change_c === values.temperature_change_c &&
      preset.values.enso_phase === values.enso_phase,
  );
  return match?.id ?? null;
}

export type ScenarioOutcome = 'positive' | 'negative' | 'mixed' | 'neutral';

export function classifyScenarioOutcome(range: QuantileRange): ScenarioOutcome {
  if (range.p10 === 0 && range.p50 === 0 && range.p90 === 0) return 'neutral';
  if (range.p10 < 0 && range.p90 > 0) return 'mixed';
  if (range.p50 >= 0 && range.p10 >= 0) return 'positive';
  if (range.p50 <= 0 && range.p90 <= 0) return 'negative';
  return 'mixed';
}

/** True when the model name says the numbers come from fixed rules or fixtures, not from training. */
export function isStubModel(modelName: string): boolean {
  return /stub|fixture/i.test(modelName);
}

export function sortAttributions<T extends { contribution: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

export function formatSigned(value: number, unit: string, locale: string): string {
  const text = new Intl.NumberFormat(locale, {
    signDisplay: 'exceptZero',
    maximumFractionDigits: 2,
  }).format(value);
  return `${text} ${unit}`;
}

export interface QuantileRange {
  p10: number;
  p50: number;
  p90: number;
}

export interface Axis {
  min: number;
  max: number;
  ticks: number[];
}

/** An axis that covers every range and always includes zero (the "no change" line). */
export function scenarioAxis(ranges: readonly QuantileRange[]): Axis {
  const min = Math.min(0, ...ranges.map((r) => r.p10));
  const max = Math.max(0, ...ranges.map((r) => r.p90));
  const ticks = niceTicks(min, max, 6);
  return { min: ticks[0], max: ticks[ticks.length - 1], ticks };
}

/** Horizontal positions of the p10..p90 band and the p50 mark. */
export function bandLayout(range: QuantileRange, axis: Axis, left: number, width: number) {
  const scale = linearScale([axis.min, axis.max], [left, left + width]);
  const start = scale(range.p10);
  return { bandX: start, bandWidth: scale(range.p90) - start, p50X: scale(range.p50), scale };
}
