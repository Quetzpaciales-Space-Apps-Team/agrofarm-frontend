import { describe, expect, it } from 'vitest';
import { buildClimateChart, linearScale, niceTicks, splitSegments, type ClimateRow } from '../chart';

const row = (month: string, over: Partial<ClimateRow> = {}): ClimateRow => ({
  month,
  rainfall_mm: 100,
  temperature_mean_c: 20,
  temperature_min_c: 14,
  temperature_max_c: 27,
  ...over,
});

describe('linearScale', () => {
  it('maps the domain onto the range', () => {
    const scale = linearScale([0, 100], [200, 0]);
    expect(scale(0)).toBe(200);
    expect(scale(100)).toBe(0);
    expect(scale(25)).toBe(150);
  });

  it('does not divide by zero for a flat domain', () => {
    expect(Number.isFinite(linearScale([5, 5], [0, 10])(5))).toBe(true);
  });
});

describe('niceTicks', () => {
  it('returns round tick values that cover the data', () => {
    const ticks = niceTicks(0, 287, 5);
    expect(ticks[0]).toBe(0);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(287);
    expect(ticks.every((t) => Number.isInteger(t))).toBe(true);
  });

  it('handles a flat range', () => {
    expect(niceTicks(10, 10, 4).length).toBeGreaterThanOrEqual(2);
  });
});

describe('splitSegments', () => {
  it('breaks a line at every null so gaps are never joined or zeroed', () => {
    expect(splitSegments([1, 2, null, 4, null, null, 7, 8])).toEqual([
      [
        { index: 0, value: 1 },
        { index: 1, value: 2 },
      ],
      [{ index: 3, value: 4 }],
      [
        { index: 6, value: 7 },
        { index: 7, value: 8 },
      ],
    ]);
  });

  it('returns no segments when everything is missing', () => {
    expect(splitSegments([null, null])).toEqual([]);
  });
});

describe('buildClimateChart', () => {
  const rows = [
    row('2024-01'),
    row('2024-02', { rainfall_mm: null }),
    row('2024-03', {
      temperature_mean_c: null,
      temperature_min_c: null,
      temperature_max_c: null,
    }),
    row('2024-04', { rainfall_mm: 0 }),
  ];
  const chart = buildClimateChart(rows, { width: 400, height: 200, margin: { top: 10, right: 40, bottom: 30, left: 40 } });

  it('draws no bar for a null rainfall month and a flat bar for a real zero', () => {
    expect(chart.bars.map((b) => b.height === null)).toEqual([false, true, false, false]);
    expect(chart.bars[3].height).toBe(0);
    expect(chart.bars[0].height).toBeGreaterThan(0);
  });

  it('splits temperature lines into segments around missing months', () => {
    const mean = chart.lines.find((l) => l.key === 'temperature_mean_c');
    expect(mean?.segments.map((s) => s.length)).toEqual([2, 1]);
  });

  it('lists months with missing values and which series are missing', () => {
    expect(chart.gaps).toEqual([
      { month: '2024-02', missing: ['rainfall_mm'] },
      {
        month: '2024-03',
        missing: ['temperature_mean_c', 'temperature_min_c', 'temperature_max_c'],
      },
    ]);
  });

  it('keeps all points inside the plot area', () => {
    for (const bar of chart.bars) {
      if (bar.height === null) continue;
      expect(bar.y).toBeGreaterThanOrEqual(10);
      expect(bar.y + bar.height).toBeLessThanOrEqual(170 + 0.001);
    }
  });

  it('exposes axis ticks for rainfall (mm) and temperature (degrees C)', () => {
    expect(chart.rainTicks.length).toBeGreaterThan(1);
    expect(chart.tempTicks.length).toBeGreaterThan(1);
    expect(chart.rainTicks[0].value).toBe(0);
  });

  it('handles an empty series', () => {
    const empty = buildClimateChart([], { width: 400, height: 200, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    expect(empty.bars).toEqual([]);
    expect(empty.gaps).toEqual([]);
  });
});
