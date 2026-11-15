import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRIORITIES,
  EQUIPMENT_TYPES,
  fromSliderValue,
  toSliderValue,
  validatePriorities,
  type Priorities,
} from '../priorities';

const valid = (): Priorities => structuredClone(DEFAULT_PRIORITIES);

describe('priorities defaults', () => {
  it('mirror the backend defaults: every weight 0.5, medium water, no equipment', () => {
    expect(Object.values(DEFAULT_PRIORITIES.weights)).toEqual(Array(7).fill(0.5));
    expect(DEFAULT_PRIORITIES.constraints).toEqual({ water_availability: 'medium', equipment: [] });
  });

  it('lists the four equipment types of the contract', () => {
    expect([...EQUIPMENT_TYPES]).toEqual([
      'hand_tools',
      'animal_traction',
      'tractor',
      'irrigation',
    ]);
  });
});

describe('slider conversion', () => {
  it('converts 0..1 weights to 0..100 and back without float noise', () => {
    expect(toSliderValue(0.7)).toBe(70);
    expect(fromSliderValue(70)).toBe(0.7);
    expect(fromSliderValue(toSliderValue(0.29))).toBe(0.29);
  });
});

describe('validatePriorities', () => {
  it('accepts valid priorities', () => {
    expect(validatePriorities(valid())).toEqual([]);
  });

  it('rejects weights outside 0..1 and non-numbers', () => {
    const p = valid();
    p.weights.income = 1.1;
    p.weights.water_use = -0.1;
    p.weights.forage_value = Number.NaN;
    expect(validatePriorities(p).map((e) => e.field)).toEqual([
      'weights.water_use',
      'weights.income',
      'weights.forage_value',
    ]);
  });

  it('rejects an unknown water availability', () => {
    const p = valid();
    (p.constraints as { water_availability: string }).water_availability = 'huge';
    expect(validatePriorities(p).map((e) => e.field)).toEqual(['constraints.water_availability']);
  });

  it('rejects unknown, repeated or more than ten equipment entries', () => {
    const p = valid();
    (p.constraints.equipment as string[]) = ['tractor', 'tractor', 'rocket'];
    expect(validatePriorities(p).map((e) => e.field)).toEqual(['constraints.equipment']);
    (p.constraints.equipment as string[]) = Array(11).fill('tractor');
    expect(validatePriorities(p).map((e) => e.field)).toEqual(['constraints.equipment']);
  });
});
