import { describe, expect, it } from 'vitest';
import { STRESS_TEST_CROPS, analyzeStressMatrix, type StressCellData } from '../stressTest';

const cell = (
  crop: string,
  presetId: StressCellData['presetId'],
  p50: number,
  p10 = p50 - 10,
  p90 = p50 + 10,
): StressCellData => ({
  crop,
  presetId,
  p10,
  p50,
  p90,
});

describe('analyzeStressMatrix', () => {
  it('identifies the worst scenario per crop and the most resilient crop per scenario', () => {
    const cells: StressCellData[] = [
      cell('maize', 'el_nino_drier', -20),
      cell('maize', 'heatwave', -25),
      cell('maize', 'la_nina_wetter', 8),
      cell('maize', 'normal', 0),
      cell('black_beans', 'el_nino_drier', -12),
      cell('black_beans', 'heatwave', -18),
      cell('black_beans', 'la_nina_wetter', 10),
      cell('black_beans', 'normal', 0),
    ];

    const summary = analyzeStressMatrix(cells);
    expect(summary.worstByCrop.get('maize')).toBe('heatwave');
    expect(summary.worstByCrop.get('black_beans')).toBe('heatwave');
    expect(summary.bestByScenario.get('el_nino_drier')).toBe('black_beans');
    expect(summary.bestByScenario.get('heatwave')).toBe('black_beans');
    expect(summary.bestByScenario.get('la_nina_wetter')).toBe('black_beans');
    expect(summary.allCropsEqual).toBe(false);
    expect(summary.worstOverall).toEqual({
      crop: 'maize',
      presetId: 'heatwave',
      p50: -25,
    });
  });

  it('marks allCropsEqual when every crop returns identical medians for every scenario', () => {
    const cells: StressCellData[] = [];
    for (const crop of STRESS_TEST_CROPS) {
      cells.push(cell(crop, 'el_nino_drier', -16.75));
      cells.push(cell(crop, 'normal', 0));
    }
    const summary = analyzeStressMatrix(cells);
    expect(summary.allCropsEqual).toBe(true);
    expect(summary.bestByScenario.size).toBe(0);
  });

  it('returns empty maps when given no cells', () => {
    const summary = analyzeStressMatrix([]);
    expect(summary.worstByCrop.size).toBe(0);
    expect(summary.bestByScenario.size).toBe(0);
    expect(summary.worstOverall).toBeNull();
  });
});
