/**
 * The pilot crops and how they compare. The numbers (0 to 1) are copied from the team's crop
 * traits table, `agrofarm-analytic/services/ml/src/agrofarm_ml/rotations/data/crop_traits.json`
 * (version 0.1.0). They are PROVISIONAL starting values, not measurements.
 */
export const TRAIT_KEYS = ['water', 'nitrogen', 'income', 'erosion', 'market'] as const;
export type TraitKey = (typeof TRAIT_KEYS)[number];

export type CropId = 'maize' | 'black_beans' | 'cover_crop' | 'fallow';

export interface CropInfo {
  id: CropId;
  image: string;
  author: string;
  license: string;
  traits: Record<TraitKey, number>;
}

export const CROPS: readonly CropInfo[] = [
  {
    id: 'maize',
    image: '/landing/maize.jpg',
    author: 'Bembety',
    license: 'CC0',
    traits: { water: 0.7, nitrogen: 0.0, income: 0.6, erosion: 0.3, market: 0.8 },
  },
  {
    id: 'black_beans',
    image: '/landing/crops/black-beans.jpg',
    author: 'Josef Schlaghecken',
    license: 'CC BY-SA 4.0',
    traits: { water: 0.5, nitrogen: 0.8, income: 0.6, erosion: 0.4, market: 0.7 },
  },
  {
    id: 'cover_crop',
    image: '/landing/crops/cover-crop.jpg',
    author: 'Hugh Venables',
    license: 'CC BY-SA 2.0',
    traits: { water: 0.3, nitrogen: 0.5, income: 0.1, erosion: 0.9, market: 0.1 },
  },
  {
    id: 'fallow',
    image: '/landing/crops/fallow.jpg',
    author: 'Graham Robson',
    license: 'CC BY-SA 2.0',
    traits: { water: 0.0, nitrogen: 0.0, income: 0.0, erosion: 0.1, market: 0.0 },
  },
];

export const level = (value: number): 'low' | 'medium' | 'high' =>
  value < 0.34 ? 'low' : value < 0.67 ? 'medium' : 'high';

/** Finds a pilot crop from a strategy step such as "black_beans" or "Black beans". */
export function cropFor(step: string): CropInfo | undefined {
  const key = step
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return CROPS.find((crop) => crop.id === key);
}
