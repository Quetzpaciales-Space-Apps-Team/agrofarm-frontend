/** File size for people: kB below 1 MB, MB above (decimal units). */
export function formatFileSize(bytes: number, locale: string): string {
  const fmt = (value: number, unit: string) =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
  return bytes < 1_000_000 ? fmt(bytes / 1000, 'kB') : fmt(bytes / 1_000_000, 'MB');
}
