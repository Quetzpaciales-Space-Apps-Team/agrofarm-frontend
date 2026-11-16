import { describe, expect, it } from 'vitest';
import {
  defaultRange,
  formatArea,
  formatMonth,
  formatValue,
  humanizeId,
  monthsInRange,
} from '../months';

const months = ['2023-11', '2023-12', '2024-01', '2024-02', '2024-03'];

describe('defaultRange', () => {
  it('returns the last N months of the series', () => {
    expect(defaultRange(months, 3)).toEqual({ start: '2024-01', end: '2024-03' });
  });

  it('returns the whole series when it is shorter than N', () => {
    expect(defaultRange(months, 24)).toEqual({ start: '2023-11', end: '2024-03' });
  });

  it('sorts unsorted input and returns null for an empty series', () => {
    expect(defaultRange(['2024-03', '2023-11'], 1)).toEqual({ start: '2024-03', end: '2024-03' });
    expect(defaultRange([], 24)).toBeNull();
  });
});

describe('monthsInRange', () => {
  it('includes both ends', () => {
    expect(monthsInRange(months, { start: '2023-12', end: '2024-02' })).toEqual([
      '2023-12',
      '2024-01',
      '2024-02',
    ]);
  });

  it('swaps a reversed range instead of returning nothing', () => {
    expect(monthsInRange(months, { start: '2024-02', end: '2023-12' })).toHaveLength(3);
  });
});

describe('formatMonth', () => {
  it('formats YYYY-MM with Intl, independent of the local time zone', () => {
    expect(formatMonth('2024-01', 'en')).toBe('Jan 2024');
    expect(formatMonth('2024-12', 'en')).toBe('Dec 2024');
  });

  it('supports a short style for chart ticks', () => {
    expect(formatMonth('2024-03', 'en', 'tick')).toBe('Mar 24');
  });

  it('returns the raw value for malformed input', () => {
    expect(formatMonth('nope', 'en')).toBe('nope');
  });
});

describe('formatValue and formatArea', () => {
  it('formats a number with a unit and fixed digits', () => {
    expect(formatValue(12.345, 'mm', 'en', 1)).toBe('12.3 mm');
    expect(formatValue(1234.5, 'mm', 'en', 0)).toBe('1,235 mm');
  });

  it('never turns a missing value into zero', () => {
    expect(formatValue(null, 'mm', 'en')).toBeNull();
    expect(formatValue(undefined, 'mm', 'en')).toBeNull();
  });

  it('keeps a real zero', () => {
    expect(formatValue(0, 'mm', 'en', 1)).toBe('0 mm');
  });

  it('formats hectares', () => {
    expect(formatArea(119.4, 'en')).toBe('119.4 ha');
  });
});

describe('humanizeId', () => {
  it('turns a crop id into readable text', () => {
    expect(humanizeId('black_beans')).toBe('Black beans');
    expect(humanizeId('maize')).toBe('Maize');
  });
});
