export type EnsoPhase = 'el_nino' | 'la_nina' | 'neutral';

export interface EnsoCell {
  month: string;
  phase: EnsoPhase | null;
}

/** One cell per requested month. A month the series does not cover has phase `null`. */
export function ensoCells(
  months: readonly string[],
  items: readonly { month: string; phase: EnsoPhase }[],
): EnsoCell[] {
  const byMonth = new Map(items.map((item) => [item.month, item.phase]));
  return months.map((month) => ({ month, phase: byMonth.get(month) ?? null }));
}

/** Short text code shown inside every cell, so the phase never depends on colour alone. */
export function ensoCode(phase: EnsoPhase | null): string {
  switch (phase) {
    case 'el_nino':
      return 'EN';
    case 'la_nina':
      return 'LN';
    case 'neutral':
      return 'NE';
    default:
      return 'NA';
  }
}
