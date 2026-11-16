import type { EnsoPhase } from './enso';

export type SeriesKey =
  'rainfall_mm' | 'temperature_mean_c' | 'temperature_min_c' | 'temperature_max_c';

export interface ClimateRow {
  month: string;
  rainfall_mm: number | null;
  temperature_mean_c: number | null;
  temperature_min_c: number | null;
  temperature_max_c: number | null;
}

export interface ChartDims {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d0 === d1) return () => (r0 + r1) / 2;
  return (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

const clean = (value: number) => Math.round(value * 1e9) / 1e9;

export function niceTicks(min: number, max: number, count = 5): number[] {
  const hi = max > min ? max : min + 1;
  const step = niceStep((hi - min) / Math.max(1, count - 1));
  const first = Math.floor(min / step) * step;
  const last = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let value = first; value <= last + step / 2; value += step) ticks.push(clean(value));
  return ticks;
}

export interface SegmentPoint {
  index: number;
  value: number;
}

/** Splits a series at every missing value. Gaps are never joined and never become zero. */
export function splitSegments(values: readonly (number | null)[]): SegmentPoint[][] {
  const segments: SegmentPoint[][] = [];
  let current: SegmentPoint[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 0) segments.push(current);
      current = [];
    } else {
      current.push({ index, value });
    }
  });
  if (current.length > 0) segments.push(current);
  return segments;
}

export interface ChartBar {
  month: string;
  x: number;
  width: number;
  y: number;
  /** `null` means no data: nothing is drawn. `0` is a real zero. */
  height: number | null;
  value: number | null;
}

export interface ChartLine {
  key: Exclude<SeriesKey, 'rainfall_mm'>;
  segments: { month: string; x: number; y: number; value: number }[][];
}

export interface ChartGap {
  month: string;
  missing: SeriesKey[];
}

export interface ClimateChart {
  plot: { left: number; top: number; width: number; height: number };
  bars: ChartBar[];
  lines: ChartLine[];
  gaps: ChartGap[];
  gapBands: { month: string; x: number; width: number }[];
  rainTicks: { value: number; y: number }[];
  tempTicks: { value: number; y: number }[];
  centers: { month: string; x: number }[];
}

const TEMP_KEYS = ['temperature_mean_c', 'temperature_min_c', 'temperature_max_c'] as const;
const ALL_KEYS: SeriesKey[] = ['rainfall_mm', ...TEMP_KEYS];

export function buildClimateChart(rows: readonly ClimateRow[], dims: ChartDims): ClimateChart {
  const { width, height, margin } = dims;
  const plot = {
    left: margin.left,
    top: margin.top,
    width: Math.max(0, width - margin.left - margin.right),
    height: Math.max(0, height - margin.top - margin.bottom),
  };
  const bottom = plot.top + plot.height;

  const rains = rows.map((r) => r.rainfall_mm).filter((v): v is number => v !== null);
  const temps = rows.flatMap((r) =>
    TEMP_KEYS.map((key) => r[key]).filter((v): v is number => v !== null),
  );
  const rainTickValues = niceTicks(0, rains.length ? Math.max(...rains) : 0, 5);
  const tempTickValues = temps.length
    ? niceTicks(Math.min(...temps), Math.max(...temps), 5)
    : niceTicks(0, 1, 5);

  const rainScale = linearScale(
    [rainTickValues[0], rainTickValues.at(-1) as number],
    [bottom, plot.top],
  );
  const tempScale = linearScale(
    [tempTickValues[0], tempTickValues.at(-1) as number],
    [bottom, plot.top],
  );

  const band = rows.length > 0 ? plot.width / rows.length : 0;
  const centerOf = (index: number) => plot.left + band * index + band / 2;

  const bars: ChartBar[] = rows.map((row, index) => {
    const x = plot.left + band * index + band * 0.15;
    if (row.rainfall_mm === null) {
      return { month: row.month, x, width: band * 0.7, y: bottom, height: null, value: null };
    }
    const y = rainScale(row.rainfall_mm);
    return {
      month: row.month,
      x,
      width: band * 0.7,
      y,
      height: bottom - y,
      value: row.rainfall_mm,
    };
  });

  const lines: ChartLine[] = TEMP_KEYS.map((key) => ({
    key,
    segments: splitSegments(rows.map((r) => r[key])).map((segment) =>
      segment.map(({ index, value }) => ({
        month: rows[index].month,
        x: centerOf(index),
        y: tempScale(value),
        value,
      })),
    ),
  }));

  const gaps: ChartGap[] = [];
  const gapBands: ClimateChart['gapBands'] = [];
  rows.forEach((row, index) => {
    const missing = ALL_KEYS.filter((key) => row[key] === null);
    if (missing.length > 0) {
      gaps.push({ month: row.month, missing });
      gapBands.push({ month: row.month, x: plot.left + band * index, width: band });
    }
  });

  return {
    plot,
    bars,
    lines,
    gaps,
    gapBands,
    rainTicks: rainTickValues.map((value) => ({ value, y: rainScale(value) })),
    tempTicks: tempTickValues.map((value) => ({ value, y: tempScale(value) })),
    centers: rows.map((row, index) => ({ month: row.month, x: centerOf(index) })),
  };
}

export interface ClimateSummary {
  months: number;
  monthsWithGaps: number;
  rain: { min: number; max: number } | null;
  temp: { min: number; max: number } | null;
}

function extent(values: number[]): { min: number; max: number } | null {
  return values.length === 0 ? null : { min: Math.min(...values), max: Math.max(...values) };
}

/** Numbers for the text summary of the chart. Missing values are skipped, never counted as zero. */
export function summarizeClimate(rows: readonly ClimateRow[]): ClimateSummary {
  const present = (values: (number | null)[]) => values.filter((v): v is number => v !== null);
  return {
    months: rows.length,
    monthsWithGaps: rows.filter((row) => ALL_KEYS.some((key) => row[key] === null)).length,
    rain: extent(present(rows.map((r) => r.rainfall_mm))),
    temp: extent(present(rows.flatMap((r) => TEMP_KEYS.map((key) => r[key])))),
  };
}

export interface ClimatePeriodSummary {
  months: number;
  wettest: { month: string; rainfall_mm: number } | null;
  driest: { month: string; rainfall_mm: number } | null;
  totalRainMm: number | null;
  meanTempC: number | null;
  elNinoMonths: number;
  laNinaMonths: number;
}

/** Client-side summary for the selected climate range, with non-causal ENSO counts. */
export function summarizeClimatePeriod(
  rows: readonly ClimateRow[],
  ensoItems: readonly { month: string; phase: EnsoPhase }[],
): ClimatePeriodSummary {
  let wettest: { month: string; rainfall_mm: number } | null = null;
  let driest: { month: string; rainfall_mm: number } | null = null;
  let rainSum = 0;
  let rainCount = 0;
  let tempSum = 0;
  let tempCount = 0;

  for (const row of rows) {
    if (row.rainfall_mm !== null) {
      rainSum += row.rainfall_mm;
      rainCount += 1;
      if (wettest === null || row.rainfall_mm > wettest.rainfall_mm) {
        wettest = { month: row.month, rainfall_mm: row.rainfall_mm };
      }
      if (driest === null || row.rainfall_mm < driest.rainfall_mm) {
        driest = { month: row.month, rainfall_mm: row.rainfall_mm };
      }
    }
    if (row.temperature_mean_c !== null) {
      tempSum += row.temperature_mean_c;
      tempCount += 1;
    }
  }

  const phaseByMonth = new Map(ensoItems.map((item) => [item.month, item.phase]));
  let elNinoMonths = 0;
  let laNinaMonths = 0;
  for (const row of rows) {
    const phase = phaseByMonth.get(row.month);
    if (phase === 'el_nino') elNinoMonths += 1;
    else if (phase === 'la_nina') laNinaMonths += 1;
  }

  return {
    months: rows.length,
    wettest,
    driest,
    totalRainMm: rainCount > 0 ? Math.round(rainSum * 10) / 10 : null,
    meanTempC: tempCount > 0 ? Math.round((tempSum / tempCount) * 10) / 10 : null,
    elNinoMonths,
    laNinaMonths,
  };
}
