import { describe, expect, it } from 'vitest';
import { summarizeClimate, type ClimateRow } from '../chart';

const row = (month: string, over: Partial<ClimateRow> = {}): ClimateRow => ({
  month,
  rainfall_mm: 10,
  temperature_mean_c: 20,
  temperature_min_c: 15,
  temperature_max_c: 28,
  ...over,
});

describe('summarizeClimate', () => {
  it('reports min and max of rainfall and of all temperatures, ignoring missing values', () => {
    const summary = summarizeClimate([
      row('2024-01', { rainfall_mm: 5 }),
      row('2024-02', { rainfall_mm: null, temperature_max_c: null }),
      row('2024-03', { rainfall_mm: 250, temperature_min_c: 12 }),
    ]);
    expect(summary.rain).toEqual({ min: 5, max: 250 });
    expect(summary.temp).toEqual({ min: 12, max: 28 });
    expect(summary.monthsWithGaps).toBe(1);
    expect(summary.months).toBe(3);
  });

  it('keeps a real zero as the minimum and returns null when nothing has data', () => {
    expect(summarizeClimate([row('2024-01', { rainfall_mm: 0 })]).rain).toEqual({ min: 0, max: 0 });
    const none = summarizeClimate([
      row('2024-01', {
        rainfall_mm: null,
        temperature_mean_c: null,
        temperature_min_c: null,
        temperature_max_c: null,
      }),
    ]);
    expect(none.rain).toBeNull();
    expect(none.temp).toBeNull();
  });
});
