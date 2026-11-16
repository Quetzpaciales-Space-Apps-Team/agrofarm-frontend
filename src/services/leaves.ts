import type { ApiClient } from '../infrastructure/api/client';

export const LEAF_CLASSES = [
  'common_rust',
  'corn_leaf_blight',
  'gray_leaf_spot',
  'healthy',
  'insect_damage',
] as const;
export type LeafClass = (typeof LEAF_CLASSES)[number];
export interface LeafAssessment {
  assessment: 'possible_condition' | 'uncertain';
  candidate: LeafClass | null;
  scores: Record<LeafClass, number>;
  needs_local_review: true;
  score_interpretation: string;
  guidance: { status: string; next_steps: string[]; sources: { url: string; scope: string }[] };
  limits: string[];
  disclaimer: string;
  provenance: { model_version: string };
}

function bytes(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The photo could not be read.'));
    reader.onload = () =>
      reader.result && typeof reader.result !== 'string'
        ? resolve(reader.result)
        : reject(new Error('The photo could not be read.'));
    reader.readAsArrayBuffer(file);
  });
}

export async function assessLeaf(
  client: ApiClient,
  farmId: string,
  file: File,
  signal: AbortSignal,
) {
  const rawBody = await bytes(file);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  return client.post<LeafAssessment>(`/v1/farms/${encodeURIComponent(farmId)}/leaves/assess`, {
    rawBody,
    contentType: file.type,
    signal,
  });
}

export const isHttps = (url: string) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};
