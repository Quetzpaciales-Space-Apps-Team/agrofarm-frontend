export const PRIORITY_KEYS = [
  'water_use',
  'income',
  'soil_structure',
  'forage_value',
  'nitrogen_fixing',
  'erosion_reduction',
  'market_suitability',
] as const;

export type PriorityKey = (typeof PRIORITY_KEYS)[number];

export interface RotationStrategy {
  id: string;
  name: string;
  is_current: boolean;
  sequence: string[];
  overall_score: number;
  scores: Record<PriorityKey, number>;
  uncertainty: { low: number; high: number };
  why: string[];
  evidence: { statement: string; source: string }[];
  benefits: string[];
  gaps: string[];
  risks: { description: string; needs_local_review: boolean }[];
  needs_local_review: boolean;
}

/** Scores come as 0..1 and are shown as 0..100. */
export function toPercent(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

/** Highest score first. Equal scores keep the order the API sent them in. */
export function orderStrategies<T extends { overall_score: number }>(
  strategies: readonly T[],
): T[] {
  return strategies
    .map((strategy, index) => ({ strategy, index }))
    .sort((a, b) => b.strategy.overall_score - a.strategy.overall_score || a.index - b.index)
    .map(({ strategy }) => strategy);
}

/** A strategy is only shown with all five blocks: why, evidence, benefits, gaps and risks. */
export function hasRequiredBlocks(strategy: RotationStrategy): boolean {
  return (
    strategy.why.length > 0 &&
    strategy.evidence.length > 0 &&
    strategy.benefits.length > 0 &&
    strategy.gaps.length > 0 &&
    strategy.risks.length > 0
  );
}
