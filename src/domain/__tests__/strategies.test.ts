import { describe, expect, it } from 'vitest';
import {
  PRIORITY_KEYS,
  hasRequiredBlocks,
  orderStrategies,
  toPercent,
  type RotationStrategy,
} from '../strategies';

const strategy = (
  id: string,
  overall: number,
  over: Partial<RotationStrategy> = {},
): RotationStrategy => ({
  id,
  name: id,
  is_current: false,
  sequence: ['maize'],
  overall_score: overall,
  scores: {
    water_use: 0.5,
    income: 0.5,
    soil_structure: 0.5,
    forage_value: 0.5,
    nitrogen_fixing: 0.5,
    erosion_reduction: 0.5,
    market_suitability: 0.5,
  },
  uncertainty: { low: overall - 0.1, high: overall + 0.1 },
  why: ['w'],
  evidence: [{ statement: 's', source: 'src' }],
  benefits: ['b'],
  gaps: ['g'],
  risks: [{ description: 'r', needs_local_review: true }],
  needs_local_review: true,
  ...over,
});

describe('toPercent', () => {
  it('shows 0..1 as 0..100, rounded', () => {
    expect(toPercent(0)).toBe(0);
    expect(toPercent(0.664)).toBe(66);
    expect(toPercent(1)).toBe(100);
  });
  it('clamps out-of-range values', () => {
    expect(toPercent(-0.2)).toBe(0);
    expect(toPercent(1.4)).toBe(100);
  });
});

describe('orderStrategies', () => {
  it('orders by overall score, highest first, keeping input order for ties', () => {
    const ordered = orderStrategies([strategy('a', 0.5), strategy('b', 0.7), strategy('c', 0.5)]);
    expect(ordered.map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('PRIORITY_KEYS', () => {
  it('lists the seven farmer priorities', () => {
    expect(PRIORITY_KEYS).toHaveLength(7);
  });
});

describe('hasRequiredBlocks', () => {
  it('accepts a strategy with why, evidence, benefits, gaps and risks', () => {
    expect(hasRequiredBlocks(strategy('a', 0.5))).toBe(true);
  });

  it.each(['why', 'evidence', 'benefits', 'gaps', 'risks'] as const)(
    'rejects a strategy with an empty %s block',
    (block) => {
      expect(hasRequiredBlocks(strategy('a', 0.5, { [block]: [] }))).toBe(false);
    },
  );
});
