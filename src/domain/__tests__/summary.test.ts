import { describe, expect, it } from 'vitest';
import { summarizeClimate, summarizeClimatePeriod, type ClimateRow } from '../chart';

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

describe('summarizeClimatePeriod', () => {
  it('computes wettest, driest, total rain, mean temperature, and ENSO phase counts', () => {
    const rows = [
      row('2024-01', { rainfall_mm: 10, temperature_mean_c: 18 }),
      row('2024-02', { rainfall_mm: null, temperature_mean_c: 20 }),
      row('2024-03', { rainfall_mm: 120, temperature_mean_c: 22 }),
      row('2024-04', { rainfall_mm: 0, temperature_mean_c: null }),
    ];
    const enso = [
      { month: '2024-01', phase: 'el_nino' as const },
      { month: '2024-02', phase: 'el_nino' as const },
      { month: '2024-03', phase: 'neutral' as const },
      { month: '2024-04', phase: 'la_nina' as const },
    ];
    const summary = summarizeClimatePeriod(rows, enso);
    expect(summary.months).toBe(4);
    expect(summary.wettest).toEqual({ month: '2024-03', rainfall_mm: 120 });
    expect(summary.driest).toEqual({ month: '2024-04', rainfall_mm: 0 });
    expect(summary.totalRainMm).toBe(130);
    expect(summary.meanTempC).toBe(20);
    expect(summary.elNinoMonths).toBe(2);
    expect(summary.laNinaMonths).toBe(1);
  });

  it('returns null metrics and zero ENSO counts for an empty or no-data range', () => {
    expect(summarizeClimatePeriod([], [])).toEqual({
      months: 0,
      wettest: null,
      driest: null,
      totalRainMm: null,
      meanTempC: null,
      elNinoMonths: 0,
      laNinaMonths: 0,
    });
    const noData = summarizeClimatePeriod(
      [row('2024-01', { rainfall_mm: null, temperature_mean_c: null })],
      [],
    );
    expect(noData.wettest).toBeNull();
    expect(noData.driest).toBeNull();
    expect(noData.totalRainMm).toBeNull();
    expect(noData.meanTempC).toBeNull();
    expect(noData.elNinoMonths).toBe(0);
    expect(noData.laNinaMonths).toBe(0);
  });
});
