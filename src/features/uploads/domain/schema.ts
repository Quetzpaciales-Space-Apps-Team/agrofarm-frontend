/**
 * Farm upload schema (DEC-005, agrofarm-docs `docs/data/farm-upload-schema.md`).
 * Pure TypeScript. The server validates again: nothing here is a trust boundary.
 */

export const CSV_COLUMNS = [
  'parcel_id',
  'season_year',
  'crop',
  'sowing_date',
  'harvest_date',
  'area_ha',
  'latitude',
  'longitude',
  'yield_kg_ha',
  'irrigation',
  'soil_ph',
  'soil_om_pct',
  'soil_n_mg_kg',
  'soil_p_mg_kg',
  'soil_k_mg_kg',
  'rainfall_season_mm',
  'notes',
] as const;

export type ColumnName = (typeof CSV_COLUMNS)[number];

/** Columns that must exist in a CSV header. */
export const REQUIRED_CSV_COLUMNS: readonly ColumnName[] = [
  'parcel_id',
  'season_year',
  'crop',
  'sowing_date',
  'area_ha',
  'latitude',
  'longitude',
];

export const IRRIGATION_VALUES = ['rainfed', 'drip', 'sprinkler', 'furrow'] as const;

/** The server rejects bodies above 2 MiB, multipart overhead included: keep a margin. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024 - 1024;

/** How many rows the preview shows. */
export const PREVIEW_ROWS = 5;

export const ACCEPTED_EXTENSIONS = ['.csv', '.geojson', '.json'] as const;

export const TEMPLATE_FILENAME = 'agrofarm-farm-upload-template.csv';

/** Example rows from the schema doc. Fake values; the farmer replaces them. */
const TEMPLATE_ROWS: readonly Record<ColumnName, string>[] = [
  {
    parcel_id: 'parcel_01',
    season_year: '2024',
    crop: 'maize',
    sowing_date: '2024-05-15',
    harvest_date: '2024-10-20',
    area_ha: '2.5',
    latitude: '14.5892',
    longitude: '-90.5315',
    yield_kg_ha: '3200',
    irrigation: 'rainfed',
    soil_ph: '6.2',
    soil_om_pct: '3.1',
    soil_n_mg_kg: '42.0',
    soil_p_mg_kg: '18.5',
    soil_k_mg_kg: '165.0',
    rainfall_season_mm: '980.5',
    notes: 'Example row: replace with your own data',
  },
  {
    parcel_id: 'parcel_02',
    season_year: '2025',
    crop: 'squash',
    sowing_date: '2025-06-01',
    harvest_date: '',
    area_ha: '1.2',
    latitude: '14.5901',
    longitude: '-90.5302',
    yield_kg_ha: '',
    irrigation: 'drip',
    soil_ph: '6.1',
    soil_om_pct: '2.9',
    soil_n_mg_kg: '',
    soil_p_mg_kg: '',
    soil_k_mg_kg: '',
    rainfall_season_mm: '',
    notes: 'Harvest pending: empty cells mean not known',
  },
];

const NUMERIC_COLUMNS: ReadonlySet<ColumnName> = new Set([
  'season_year',
  'area_ha',
  'latitude',
  'longitude',
  'yield_kg_ha',
  'soil_ph',
  'soil_om_pct',
  'soil_n_mg_kg',
  'soil_p_mg_kg',
  'soil_k_mg_kg',
  'rainfall_season_mm',
]);

/**
 * One CSV cell. Text cells that start with `=`, `+`, `-` or `@` get a leading apostrophe so a
 * spreadsheet never runs them as a formula. Numeric cells are left alone: a negative longitude
 * is data, and the schema only asks for escaping in text.
 */
function csvCell(column: ColumnName, value: string): string {
  const safe = !NUMERIC_COLUMNS.has(column) && /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The CSV template, built from the schema in the browser. Empty cell = missing value. */
export function buildTemplateCsv(): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const row of TEMPLATE_ROWS) {
    lines.push(CSV_COLUMNS.map((column) => csvCell(column, row[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}
