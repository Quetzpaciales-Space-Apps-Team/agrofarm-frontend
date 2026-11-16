import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCENARIO,
  SCENARIO_LIMITS,
  SCENARIO_PRESETS,
  bandLayout,
  classifyScenarioOutcome,
  formatSigned,
  isStubModel,
  matchingPresetId,
  scenarioAxis,
  sortAttributions,
} from '../scenario';

describe('scenario limits', () => {
  it('match the contract: rainfall -80..100 step 5, temperature -5..8 step 0.5', () => {
    expect(SCENARIO_LIMITS.rainfall).toEqual({ min: -80, max: 100, step: 5 });
    expect(SCENARIO_LIMITS.temperature).toEqual({ min: -5, max: 8, step: 0.5 });
  });

  it('defaults to no change and a neutral ENSO phase', () => {
    expect(DEFAULT_SCENARIO).toEqual({
      rainfall_change_pct: 0,
      temperature_change_c: 0,
      enso_phase: 'neutral',
    });
  });
});

describe('isStubModel', () => {
  it.each(['agrofarm-stub', 'Fixture-v2', 'lightgbm-STUB-0.1', 'rules_fixture'])(
    'recognises %s',
    (name) => expect(isStubModel(name)).toBe(true),
  );
  it('does not flag a real model name', () => {
    expect(isStubModel('lightgbm-guatemala-yield-anomaly')).toBe(false);
  });
});

describe('sortAttributions', () => {
  it('orders by absolute size, keeping sign, without mutating the input', () => {
    const input = [
      { feature: 'a', contribution: 1.5 },
      { feature: 'b', contribution: -8.5 },
      { feature: 'c', contribution: 3.9 },
    ];
    const sorted = sortAttributions(input);
    expect(sorted.map((x) => x.feature)).toEqual(['b', 'c', 'a']);
    expect(input[0].feature).toBe('a');
  });
});

describe('formatSigned', () => {
  it('always shows the sign except for zero, with the unit', () => {
    expect(formatSigned(3.5, '%', 'en')).toBe('+3.5 %');
    expect(formatSigned(-20, '%', 'en')).toBe('-20 %');
    expect(formatSigned(0, '%', 'en')).toBe('0 %');
    expect(formatSigned(1, '°C', 'en')).toBe('+1 °C');
  });
});

describe('scenarioAxis and bandLayout', () => {
  const baseline = { p10: -12, p50: 0, p90: 11 };
  const scenario = { p10: -31, p50: -14, p90: 2 };

  it('builds an axis that covers both ranges and zero', () => {
    const axis = scenarioAxis([baseline, scenario]);
    expect(axis.min).toBeLessThanOrEqual(-31);
    expect(axis.max).toBeGreaterThanOrEqual(11);
    expect(axis.ticks).toContain(0);
  });

  it('keeps zero in the axis even when every value is positive', () => {
    const axis = scenarioAxis([{ p10: 5, p50: 8, p90: 12 }]);
    expect(axis.min).toBeLessThanOrEqual(0);
  });

  it('lays out the p10..p90 band and the p50 mark inside the width', () => {
    const axis = scenarioAxis([baseline, scenario]);
    const layout = bandLayout(scenario, axis, 0, 400);
    expect(layout.bandX).toBeLessThan(layout.bandX + layout.bandWidth);
    expect(layout.p50X).toBeGreaterThan(layout.bandX);
    expect(layout.p50X).toBeLessThan(layout.bandX + layout.bandWidth);
    expect(layout.bandX).toBeGreaterThanOrEqual(0);
    expect(layout.bandX + layout.bandWidth).toBeLessThanOrEqual(400);
  });
});

describe('SCENARIO_PRESETS and matchingPresetId', () => {
  it('defines four presets within contract limits', () => {
    expect(SCENARIO_PRESETS).toHaveLength(4);
    for (const preset of SCENARIO_PRESETS) {
      expect(preset.values.rainfall_change_pct).toBeGreaterThanOrEqual(
        SCENARIO_LIMITS.rainfall.min,
      );
      expect(preset.values.rainfall_change_pct).toBeLessThanOrEqual(SCENARIO_LIMITS.rainfall.max);
      expect(preset.values.temperature_change_c).toBeGreaterThanOrEqual(
        SCENARIO_LIMITS.temperature.min,
      );
      expect(preset.values.temperature_change_c).toBeLessThanOrEqual(
        SCENARIO_LIMITS.temperature.max,
      );
    }
  });

  it('matches a preset when all three inputs match, and returns null when customized', () => {
    const elNino = SCENARIO_PRESETS.find((p) => p.id === 'el_nino_drier')!;
    expect(matchingPresetId(elNino.values)).toBe('el_nino_drier');
    expect(matchingPresetId({ ...elNino.values, rainfall_change_pct: -25 })).toBeNull();
  });
});

describe('classifyScenarioOutcome', () => {
  it('classifies positive, negative, mixed (crosses zero), and neutral bands', () => {
    expect(classifyScenarioOutcome({ p10: 3, p50: 8, p90: 14 })).toBe('positive');
    expect(classifyScenarioOutcome({ p10: -28, p50: -13, p90: -2 })).toBe('negative');
    expect(classifyScenarioOutcome({ p10: -12, p50: -3, p90: 6 })).toBe('mixed');
    expect(classifyScenarioOutcome({ p10: 0, p50: 0, p90: 0 })).toBe('neutral');
  });
});
