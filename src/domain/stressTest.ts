import type { ScenarioPresetId } from './scenarioPresets';

/** Pilot crops supported by the rotation engine and `POST /v1/scenarios/simulate`. */
export const STRESS_TEST_CROPS = ['maize', 'black_beans', 'cover_crop'] as const;

export interface StressCellData {
  crop: string;
  presetId: ScenarioPresetId;
  p10: number;
  p50: number;
  p90: number;
}

export interface StressMatrixSummary {
  worstByCrop: Map<string, ScenarioPresetId>;
  bestByScenario: Map<ScenarioPresetId, string>;
  allCropsEqual: boolean;
  worstOverall: { crop: string; presetId: ScenarioPresetId; p50: number } | null;
}

export function analyzeStressMatrix(cells: readonly StressCellData[]): StressMatrixSummary {
  const worstByCrop = new Map<string, ScenarioPresetId>();
  const bestByScenario = new Map<ScenarioPresetId, string>();

  if (cells.length === 0) {
    return { worstByCrop, bestByScenario, allCropsEqual: false, worstOverall: null };
  }

  const byCrop = new Map<string, StressCellData[]>();
  const byScenario = new Map<ScenarioPresetId, StressCellData[]>();

  let worstOverall: StressMatrixSummary['worstOverall'] = null;

  for (const cell of cells) {
    const cropList = byCrop.get(cell.crop) ?? [];
    cropList.push(cell);
    byCrop.set(cell.crop, cropList);

    const scenList = byScenario.get(cell.presetId) ?? [];
    scenList.push(cell);
    byScenario.set(cell.presetId, scenList);

    if (worstOverall === null || cell.p50 < worstOverall.p50) {
      worstOverall = { crop: cell.crop, presetId: cell.presetId, p50: cell.p50 };
    }
  }

  for (const [crop, list] of byCrop) {
    let minCell = list[0];
    for (const c of list) {
      if (c.p50 < minCell.p50) minCell = c;
    }
    worstByCrop.set(crop, minCell.presetId);
  }

  let anyScenarioDiffers = false;
  for (const [presetId, list] of byScenario) {
    const distinctP50 = new Set(list.map((c) => c.p50));
    if (distinctP50.size > 1) {
      anyScenarioDiffers = true;
      let maxCell = list[0];
      for (const c of list) {
        if (c.p50 > maxCell.p50) maxCell = c;
      }
      bestByScenario.set(presetId, maxCell.crop);
    }
  }

  return {
    worstByCrop,
    bestByScenario,
    allCropsEqual: !anyScenarioDiffers && byCrop.size > 1,
    worstOverall,
  };
}
