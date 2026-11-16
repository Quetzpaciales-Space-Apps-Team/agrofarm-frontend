export const GLOSSARY_TERMS = [
  'evapotranspiration',
  'ndvi',
  'soil_moisture_anomaly',
  'frost_risk',
  'water_balance',
] as const;
export type GlossaryTerm = (typeof GLOSSARY_TERMS)[number];

/** Words that mark a glossary term inside free text. Matched case-insensitively. */
export const GLOSSARY_PATTERNS: Record<GlossaryTerm, string> = {
  evapotranspiration: 'evapotranspiration',
  ndvi: 'NDVI',
  soil_moisture_anomaly: 'soil moisture anomaly',
  frost_risk: 'frost risk',
  water_balance: 'water balance',
};

export interface TextPart {
  text: string;
  term?: string;
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Splits text into plain parts and glossary term parts. Whole words only. */
export function splitByGlossary(
  text: string,
  patterns: Readonly<Record<string, string>> = GLOSSARY_PATTERNS,
): TextPart[] {
  const entries = Object.entries(patterns).sort((a, b) => b[1].length - a[1].length);
  if (entries.length === 0) return [{ text }];
  const regex = new RegExp(
    `(?<![\\p{L}\\p{N}])(${entries.map(([, p]) => escape(p)).join('|')})(?![\\p{L}\\p{N}])`,
    'giu',
  );
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(regex)) {
    const found = match[0];
    const term = entries.find(([, p]) => p.toLowerCase() === found.toLowerCase())?.[0];
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: found, term });
    last = match.index + found.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length > 0 ? parts : [{ text }];
}

/** An evidence link is shown only when the item carries a real http or https URL. */
export function safeEvidenceUrl(item: { url?: string }): string | null {
  if (!item.url) return null;
  try {
    const parsed = new URL(item.url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}
