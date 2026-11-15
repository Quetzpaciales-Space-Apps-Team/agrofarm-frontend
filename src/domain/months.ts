export interface MonthRange {
  start: string;
  end: string;
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Last `count` months of a series (months are `YYYY-MM`, so string order is time order). */
export function defaultRange(months: readonly string[], count = 24): MonthRange | null {
  if (months.length === 0) return null;
  const sorted = [...months].sort();
  return { start: sorted[Math.max(0, sorted.length - count)], end: sorted[sorted.length - 1] };
}

export function monthsInRange(months: readonly string[], range: MonthRange): string[] {
  const [start, end] =
    range.start <= range.end ? [range.start, range.end] : [range.end, range.start];
  return months.filter((m) => m >= start && m <= end);
}

export type MonthStyle = 'long' | 'tick';

export function formatMonth(month: string, locale: string, style: MonthStyle = 'long'): string {
  const match = MONTH_PATTERN.exec(month);
  if (!match) return month;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: style === 'tick' ? '2-digit' : 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** A missing value stays missing (null). It is never formatted as zero. */
export function formatValue(
  value: number | null | undefined,
  unit: string,
  locale: string,
  maximumFractionDigits = 1,
): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)} ${unit}`;
}

export function formatArea(hectares: number, locale: string): string {
  return formatValue(hectares, 'ha', locale, 1) ?? '';
}

export function humanizeId(id: string): string {
  const text = id.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
