import type { EnsoPhase } from './enso';

export const WET_SEASON_MONTHS = [5, 6, 7, 8, 9, 10] as const;
export const REALITY_MIN_YEAR = 1995;
export const REALITY_MAX_YEAR = 2025;
export const MAX_MISSING_SEASON_MONTHS = 2;

export interface NasaRainfallPoint {
  month: string;
  rainfall_mm: number | null;
}

export interface EnsoPoint {
  month: string;
  phase: EnsoPhase;
  oni: number | null;
}

export interface RealityYearEntry {
  year: number;
  totalRainMm: number;
  phase: EnsoPhase;
  meanOni: number | null;
  missingRainMonths: number;
}

export interface ExcludedYearEntry {
  year: number;
  missingRainMonths: number;
  missingEnsoMonths: number;
}

export interface RealityPhaseGroup {
  phase: EnsoPhase;
  count: number;
  meanMm: number | null;
  diffPct: number | null;
  minMm: number | null;
  maxMm: number | null;
  years: RealityYearEntry[];
}

export interface ClimateRealitySummary {
  years: RealityYearEntry[];
  excludedYears: ExcludedYearEntry[];
  overallMeanMm: number | null;
  groups: RealityPhaseGroup[];
}

export type PresetVerdict =
  'same_direction_close' | 'same_direction_partly' | 'diverges' | 'insufficient_data';

export interface PresetComparison {
  presetRainPct: number;
  observedDiffPct: number | null;
  sampleSize: number;
  verdict: PresetVerdict;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function dominantPhase(items: readonly EnsoPoint[]): EnsoPhase {
  const counts: Record<EnsoPhase, number> = { el_nino: 0, la_nina: 0, neutral: 0 };
  for (const item of items) {
    counts[item.phase] += 1;
  }
  const entries = (Object.entries(counts) as [EnsoPhase, number][]).sort((a, b) => b[1] - a[1]);
  if (entries[0][1] === entries[1][1]) return 'neutral';
  return entries[0][0];
}

/**
 * Pure seasonal aggregation for May-Oct rainfall (1995-2025) grouped by dominant ENSO phase.
 * Missing months are never treated as zero; years missing >2 months are excluded and recorded.
 */
export function analyzeClimateReality(
  nasaItems: readonly NasaRainfallPoint[],
  ensoItems: readonly EnsoPoint[],
): ClimateRealitySummary {
  const nasaByMonth = new Map(nasaItems.map((item) => [item.month, item.rainfall_mm]));
  const ensoByMonth = new Map(ensoItems.map((item) => [item.month, item]));

  const nasaYears = new Set(nasaItems.map((item) => Number(item.month.slice(0, 4))));
  const ensoYears = new Set(ensoItems.map((item) => Number(item.month.slice(0, 4))));

  const years: RealityYearEntry[] = [];
  const excludedYears: ExcludedYearEntry[] = [];

  for (let year = REALITY_MIN_YEAR; year <= REALITY_MAX_YEAR; year += 1) {
    if (!nasaYears.has(year) || !ensoYears.has(year)) continue;

    const seasonMonths = WET_SEASON_MONTHS.map(
      (month) => `${year}-${String(month).padStart(2, '0')}`,
    );

    const validRains: number[] = [];
    const seasonEnso: EnsoPoint[] = [];

    for (const ym of seasonMonths) {
      const rain = nasaByMonth.get(ym);
      if (typeof rain === 'number' && Number.isFinite(rain)) validRains.push(rain);
      const enso = ensoByMonth.get(ym);
      if (enso) seasonEnso.push(enso);
    }

    const missingRainMonths = WET_SEASON_MONTHS.length - validRains.length;
    const missingEnsoMonths = WET_SEASON_MONTHS.length - seasonEnso.length;

    if (missingRainMonths > MAX_MISSING_SEASON_MONTHS || seasonEnso.length === 0) {
      excludedYears.push({ year, missingRainMonths, missingEnsoMonths });
      continue;
    }

    const totalRainMm = round1(validRains.reduce((sum, val) => sum + val, 0));
    const phase = dominantPhase(seasonEnso);
    const validOnis = seasonEnso
      .map((item) => item.oni)
      .filter((val): val is number => typeof val === 'number' && Number.isFinite(val));
    const meanOni =
      validOnis.length > 0
        ? Math.round((validOnis.reduce((sum, val) => sum + val, 0) / validOnis.length) * 100) / 100
        : null;

    years.push({ year, totalRainMm, phase, meanOni, missingRainMonths });
  }

  const overallMeanMm =
    years.length > 0
      ? round1(years.reduce((sum, entry) => sum + entry.totalRainMm, 0) / years.length)
      : null;

  const phases: EnsoPhase[] = ['el_nino', 'la_nina', 'neutral'];
  const groups: RealityPhaseGroup[] = phases.map((phase) => {
    const groupYears = years
      .filter((entry) => entry.phase === phase)
      .sort((a, b) => {
        if (a.meanOni !== null && b.meanOni !== null) {
          return Math.abs(b.meanOni) - Math.abs(a.meanOni);
        }
        return a.year - b.year;
      });

    if (groupYears.length === 0 || overallMeanMm === null) {
      return {
        phase,
        count: 0,
        meanMm: null,
        diffPct: null,
        minMm: null,
        maxMm: null,
        years: [],
      };
    }

    const meanMm = round1(
      groupYears.reduce((sum, entry) => sum + entry.totalRainMm, 0) / groupYears.length,
    );
    const diffPct =
      overallMeanMm > 0 ? round1(((meanMm - overallMeanMm) / overallMeanMm) * 100) : null;
    const minMm = Math.min(...groupYears.map((entry) => entry.totalRainMm));
    const maxMm = Math.max(...groupYears.map((entry) => entry.totalRainMm));

    return {
      phase,
      count: groupYears.length,
      meanMm,
      diffPct,
      minMm,
      maxMm,
      years: groupYears,
    };
  });

  return { years, excludedYears, overallMeanMm, groups };
}

export function comparePresetWithObserved(
  presetRainPct: number,
  group: RealityPhaseGroup | undefined,
): PresetComparison {
  if (!group || group.count < 3 || group.diffPct === null) {
    return {
      presetRainPct,
      observedDiffPct: group?.diffPct ?? null,
      sampleSize: group?.count ?? 0,
      verdict: 'insufficient_data',
    };
  }

  const sameDirection =
    (presetRainPct > 0 && group.diffPct > 0) ||
    (presetRainPct < 0 && group.diffPct < 0) ||
    (presetRainPct === 0 && Math.abs(group.diffPct) < 5);

  if (!sameDirection) {
    return {
      presetRainPct,
      observedDiffPct: group.diffPct,
      sampleSize: group.count,
      verdict: 'diverges',
    };
  }

  const verdict =
    Math.abs(presetRainPct - group.diffPct) <= 10
      ? 'same_direction_close'
      : 'same_direction_partly';

  return {
    presetRainPct,
    observedDiffPct: group.diffPct,
    sampleSize: group.count,
    verdict,
  };
}
