import { PRIORITY_KEYS, type PriorityKey } from './strategies';

export const WATER_AVAILABILITY = ['low', 'medium', 'high'] as const;
export type WaterAvailability = (typeof WATER_AVAILABILITY)[number];

export const EQUIPMENT_TYPES = ['hand_tools', 'animal_traction', 'tractor', 'irrigation'] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

const MAX_EQUIPMENT = 10;

export interface Priorities {
  weights: Record<PriorityKey, number>;
  constraints: { water_availability: WaterAvailability; equipment: EquipmentType[] };
}

/** Same defaults as `default_priorities()` in core-api: used by "Reset to defaults". */
export const DEFAULT_PRIORITIES: Priorities = {
  weights: {
    water_use: 0.5,
    income: 0.5,
    soil_structure: 0.5,
    forage_value: 0.5,
    nitrogen_fixing: 0.5,
    erosion_reduction: 0.5,
    market_suitability: 0.5,
  },
  constraints: { water_availability: 'medium', equipment: [] },
};

export type PriorityPresetId = 'save_water' | 'more_income' | 'build_soil' | 'balanced';

export interface PriorityPreset {
  id: PriorityPresetId;
  weights: Record<PriorityKey, number>;
}

/** One-click priority presets (weights in 0..1 matching core-api). */
export const PRIORITY_PRESETS: readonly PriorityPreset[] = [
  {
    id: 'save_water',
    weights: {
      water_use: 0.95,
      income: 0.5,
      soil_structure: 0.7,
      forage_value: 0.3,
      nitrogen_fixing: 0.5,
      erosion_reduction: 0.85,
      market_suitability: 0.4,
    },
  },
  {
    id: 'more_income',
    weights: {
      water_use: 0.4,
      income: 0.95,
      soil_structure: 0.45,
      forage_value: 0.4,
      nitrogen_fixing: 0.4,
      erosion_reduction: 0.4,
      market_suitability: 0.9,
    },
  },
  {
    id: 'build_soil',
    weights: {
      water_use: 0.65,
      income: 0.45,
      soil_structure: 0.95,
      forage_value: 0.4,
      nitrogen_fixing: 0.95,
      erosion_reduction: 0.9,
      market_suitability: 0.4,
    },
  },
  {
    id: 'balanced',
    weights: { ...DEFAULT_PRIORITIES.weights },
  },
];

export function matchingPriorityPresetId(
  weights: Record<PriorityKey, number>,
): PriorityPresetId | null {
  const match = PRIORITY_PRESETS.find((preset) =>
    PRIORITY_KEYS.every((key) => Math.abs(preset.weights[key] - weights[key]) < 0.005),
  );
  return match?.id ?? null;
}

/** The form shows weights as 0..100. The API stores 0..1. */
export const toSliderValue = (weight: number): number => Math.round(weight * 100);
export const fromSliderValue = (value: number): number => Math.round(value) / 100;

export interface PriorityError {
  field: string;
  rule: 'weight_range' | 'water_availability' | 'equipment';
}

/** Mirrors the core-api rules: weights in 0..1, known water level, up to 10 known, unique equipment. */
export function validatePriorities(priorities: Priorities): PriorityError[] {
  const errors: PriorityError[] = [];
  for (const key of PRIORITY_KEYS) {
    const value = priorities.weights[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
      errors.push({ field: `weights.${key}`, rule: 'weight_range' });
    }
  }
  const { water_availability: water, equipment } = priorities.constraints;
  if (!(WATER_AVAILABILITY as readonly string[]).includes(water)) {
    errors.push({ field: 'constraints.water_availability', rule: 'water_availability' });
  }
  const known = equipment.every((item) => (EQUIPMENT_TYPES as readonly string[]).includes(item));
  if (!known || equipment.length > MAX_EQUIPMENT || new Set(equipment).size !== equipment.length) {
    errors.push({ field: 'constraints.equipment', rule: 'equipment' });
  }
  return errors;
}
