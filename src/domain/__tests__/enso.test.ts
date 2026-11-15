import { describe, expect, it } from 'vitest';
import { ensoCells, ensoCode } from '../enso';

describe('ensoCells', () => {
  const items = [
    { month: '2024-01', phase: 'el_nino' as const },
    { month: '2024-02', phase: 'neutral' as const },
    { month: '2024-04', phase: 'la_nina' as const },
  ];

  it('gives one cell per requested month and null for months without data', () => {
    expect(ensoCells(['2024-01', '2024-02', '2024-03', '2024-04'], items)).toEqual([
      { month: '2024-01', phase: 'el_nino' },
      { month: '2024-02', phase: 'neutral' },
      { month: '2024-03', phase: null },
      { month: '2024-04', phase: 'la_nina' },
    ]);
  });
});

describe('ensoCode', () => {
  it('has a distinct short text code for every phase so colour is never the only cue', () => {
    const codes = [ensoCode('el_nino'), ensoCode('la_nina'), ensoCode('neutral'), ensoCode(null)];
    expect(new Set(codes).size).toBe(4);
  });
});
