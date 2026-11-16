import { describe, expect, it } from 'vitest';
import {
  analyzeClimateReality,
  comparePresetWithObserved,
  type EnsoPoint,
  type NasaRainfallPoint,
} from '../climateReality';

function makeSeason(
  year: number,
  rains: (number | null)[],
  phases: ('el_nino' | 'la_nina' | 'neutral')[],
  onis: (number | null)[] = [0, 0, 0, 0, 0, 0],
): { nasa: NasaRainfallPoint[]; enso: EnsoPoint[] } {
  const nasa: NasaRainfallPoint[] = [];
  const enso: EnsoPoint[] = [];
  for (let i = 0; i < 6; i += 1) {
    const month = `${year}-${String(5 + i).padStart(2, '0')}`;
    nasa.push({ month, rainfall_mm: rains[i] ?? null });
    if (phases[i]) {
      enso.push({ month, phase: phases[i], oni: onis[i] ?? null });
    }
  }
  return { nasa, enso };
}

describe('analyzeClimateReality', () => {
  it('groups complete May-Oct years by dominant ENSO phase with n, mean, diff %, and range', () => {
    const y1997 = makeSeason(
      1997,
      [100, 100, 100, 100, 100, 100],
      ['el_nino', 'el_nino', 'el_nino', 'el_nino', 'el_nino', 'el_nino'],
      [1.2, 1.5, 1.8, 2.0, 2.1, 2.2],
    );
    const y1998 = makeSeason(
      1998,
      [200, 200, 200, 200, 200, 200],
      ['la_nina', 'la_nina', 'la_nina', 'la_nina', 'la_nina', 'la_nina'],
      [-1.0, -1.1, -1.2, -1.3, -1.4, -1.5],
    );
    const y2000 = makeSeason(
      2000,
      [150, 150, 150, 150, 150, 150],
      ['neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
    );

    const result = analyzeClimateReality(
      [...y1997.nasa, ...y1998.nasa, ...y2000.nasa],
      [...y1997.enso, ...y1998.enso, ...y2000.enso],
    );

    expect(result.years).toHaveLength(3);
    expect(result.excludedYears).toEqual([]);
    expect(result.overallMeanMm).toBe(900);

    const elNino = result.groups.find((g) => g.phase === 'el_nino')!;
    expect(elNino.count).toBe(1);
    expect(elNino.meanMm).toBe(600);
    expect(elNino.minMm).toBe(600);
    expect(elNino.maxMm).toBe(600);
    expect(elNino.diffPct).toBeCloseTo(-33.3, 1);

    const laNina = result.groups.find((g) => g.phase === 'la_nina')!;
    expect(laNina.count).toBe(1);
    expect(laNina.meanMm).toBe(1200);
    expect(laNina.diffPct).toBeCloseTo(33.3, 1);

    const neutral = result.groups.find((g) => g.phase === 'neutral')!;
    expect(neutral.count).toBe(1);
    expect(neutral.meanMm).toBe(900);
    expect(neutral.diffPct).toBe(0);
  });

  it('excludes years missing more than 2 season months and keeps years missing 1-2 months without inventing zeros', () => {
    const validWithGap = makeSeason(
      2001,
      [100, null, 100, 100, null, 100],
      ['neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
    );
    const excluded = makeSeason(
      2002,
      [100, null, null, null, 100, 100],
      ['el_nino', 'el_nino', 'el_nino', 'el_nino', 'el_nino', 'el_nino'],
    );

    const result = analyzeClimateReality(
      [...validWithGap.nasa, ...excluded.nasa],
      [...validWithGap.enso, ...excluded.enso],
    );

    expect(result.years).toHaveLength(1);
    expect(result.years[0].year).toBe(2001);
    expect(result.years[0].totalRainMm).toBe(400);
    expect(result.years[0].missingRainMonths).toBe(2);
    expect(result.excludedYears).toEqual([
      { year: 2002, missingRainMonths: 3, missingEnsoMonths: 0 },
    ]);
  });

  it('resolves a tie in seasonal ENSO phases to neutral', () => {
    const tied = makeSeason(
      2005,
      [100, 100, 100, 100, 100, 100],
      ['el_nino', 'el_nino', 'el_nino', 'la_nina', 'la_nina', 'la_nina'],
    );
    const result = analyzeClimateReality(tied.nasa, tied.enso);
    expect(result.years[0].phase).toBe('neutral');
  });

  it('returns empty summary when there are no overlapping years', () => {
    const result = analyzeClimateReality([], []);
    expect(result.years).toEqual([]);
    expect(result.overallMeanMm).toBeNull();
    expect(result.groups.every((g) => g.count === 0 && g.diffPct === null)).toBe(true);
  });
});

describe('comparePresetWithObserved', () => {
  it('distinguishes close match, partial support, divergence, and insufficient data', () => {
    expect(
      comparePresetWithObserved(-20, {
        phase: 'el_nino',
        count: 5,
        meanMm: 1050,
        diffPct: -12.8,
        minMm: 500,
        maxMm: 1500,
        years: [],
      }).verdict,
    ).toBe('same_direction_close');

    expect(
      comparePresetWithObserved(25, {
        phase: 'la_nina',
        count: 8,
        meanMm: 1298,
        diffPct: 7.8,
        minMm: 760,
        maxMm: 1900,
        years: [],
      }).verdict,
    ).toBe('same_direction_partly');

    expect(
      comparePresetWithObserved(-20, {
        phase: 'el_nino',
        count: 4,
        meanMm: 1300,
        diffPct: 10,
        minMm: 1000,
        maxMm: 1500,
        years: [],
      }).verdict,
    ).toBe('diverges');

    expect(
      comparePresetWithObserved(-20, {
        phase: 'el_nino',
        count: 2,
        meanMm: 1000,
        diffPct: -15,
        minMm: 900,
        maxMm: 1100,
        years: [],
      }).verdict,
    ).toBe('insufficient_data');
  });
});
