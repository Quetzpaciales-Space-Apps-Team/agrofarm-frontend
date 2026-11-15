import { parseCsv } from './csv';
import {
  CSV_COLUMNS,
  IRRIGATION_VALUES,
  PREVIEW_ROWS,
  REQUIRED_CSV_COLUMNS,
  type ColumnName,
} from './schema';

/**
 * Client-side checks that mirror the schema doc and the server rules, so people see problems
 * before sending. The server checks again and its answer is the one that counts.
 * Rows are numbered from 1 for the first data row (the header is not counted), like the server.
 * A missing value is an empty string. It is never read as zero.
 */

export type IssueCode =
  | 'required'
  | 'parcel_id'
  | 'integer'
  | 'year_range'
  | 'date_format'
  | 'date_invalid'
  | 'harvest_before_sowing'
  | 'number'
  | 'gt'
  | 'min'
  | 'max'
  | 'irrigation'
  | 'too_long'
  | 'extra_cells'
  | 'geometry'
  | 'missing_column'
  | 'no_rows'
  | 'unterminated_quote'
  | 'bad_json'
  | 'not_feature_collection'
  | 'features_not_list'
  | 'not_feature';

export interface Issue {
  row: number;
  column: string | null;
  code: IssueCode;
  params?: Record<string, string | number>;
}

export type RowValues = Record<ColumnName, string>;

export interface PreviewRow {
  row: number;
  values: RowValues;
}

export interface ValidationReport {
  format: 'csv' | 'geojson';
  /** True when the file as a whole cannot be sent (wrong structure, no rows). */
  fatal: boolean;
  rowsTotal: number;
  rowsValid: number;
  issues: Issue[];
  preview: PreviewRow[];
}

const PARCEL_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const INTEGER_RE = /^[+-]?\d+$/;
const NUMBER_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NOTES_MAX = 500;

const isBlank = (value: string) => value.trim() === '';

function isCalendarDate(text: string): boolean {
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

interface Bounds {
  gt?: number;
  min?: number;
  max?: number;
}

/** Checks the values of one record (a CSV row or GeoJSON properties). Same order as the server. */
export function validateRecord(raw: Record<string, string>, row: number): Issue[] {
  const issues: Issue[] = [];
  const add = (column: string, code: IssueCode, params?: Issue['params']) =>
    issues.push({ row, column, code, ...(params ? { params } : {}) });
  const get = (column: ColumnName) => raw[column] ?? '';

  if (!PARCEL_ID_RE.test(get('parcel_id').trim())) add('parcel_id', 'parcel_id');

  const year = get('season_year').trim();
  if (!INTEGER_RE.test(year)) add('season_year', 'integer');
  else if (Number(year) < 1980 || Number(year) > 2030) add('season_year', 'year_range');

  if (isBlank(get('crop'))) add('crop', 'required');

  const date = (column: ColumnName, required: boolean): string | null => {
    const text = get(column).trim();
    if (text === '') {
      if (required) add(column, 'required');
      return null;
    }
    if (!ISO_DATE_RE.test(text)) return (add(column, 'date_format'), null);
    if (!isCalendarDate(text)) return (add(column, 'date_invalid'), null);
    return text;
  };
  const sowing = date('sowing_date', true);
  const harvest = date('harvest_date', false);
  if (sowing && harvest && harvest < sowing) add('harvest_date', 'harvest_before_sowing');

  const number = (column: ColumnName, bounds: Bounds, required: boolean) => {
    const text = get(column).trim();
    if (text === '') {
      if (required) add(column, 'required');
      return;
    }
    const value = Number(text);
    if (!NUMBER_RE.test(text) || !Number.isFinite(value)) return add(column, 'number');
    if (bounds.gt !== undefined && value <= bounds.gt) return add(column, 'gt', { min: bounds.gt });
    if (bounds.min !== undefined && value < bounds.min)
      return add(column, 'min', { min: bounds.min });
    if (bounds.max !== undefined && value > bounds.max)
      return add(column, 'max', { max: bounds.max });
  };
  number('area_ha', { gt: 0, max: 100000 }, true);
  number('latitude', { min: -90, max: 90 }, true);
  number('longitude', { min: -180, max: 180 }, true);
  number('yield_kg_ha', { min: 0 }, false);
  number('soil_ph', { min: 3, max: 10 }, false);
  number('soil_om_pct', { min: 0, max: 100 }, false);
  number('soil_n_mg_kg', { min: 0 }, false);
  number('soil_p_mg_kg', { min: 0 }, false);
  number('soil_k_mg_kg', { min: 0 }, false);
  number('rainfall_season_mm', { min: 0 }, false);

  const irrigation = get('irrigation').trim().toLowerCase();
  if (irrigation !== '' && !(IRRIGATION_VALUES as readonly string[]).includes(irrigation)) {
    add('irrigation', 'irrigation', { values: IRRIGATION_VALUES.join(', ') });
  }
  if (get('notes').length > NOTES_MAX) add('notes', 'too_long', { max: NOTES_MAX });
  return issues;
}

const emptyValues = (): RowValues =>
  Object.fromEntries(CSV_COLUMNS.map((column) => [column, ''])) as RowValues;

const fatalReport = (format: ValidationReport['format'], issues: Issue[]): ValidationReport => ({
  format,
  fatal: true,
  rowsTotal: 0,
  rowsValid: 0,
  issues,
  preview: [],
});

export function validateCsvText(text: string): ValidationReport {
  const { rows, error } = parseCsv(text);
  if (error) return fatalReport('csv', [{ row: 1, column: null, code: error }]);

  const header = (rows[0] ?? []).map((name) => name.trim());
  if (header.length === 0) return fatalReport('csv', [{ row: 1, column: null, code: 'no_rows' }]);
  const missing = REQUIRED_CSV_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    return fatalReport(
      'csv',
      missing.map((column) => ({ row: 1, column, code: 'missing_column' as const })),
    );
  }
  const body = rows.slice(1);
  if (body.length === 0) return fatalReport('csv', [{ row: 1, column: null, code: 'no_rows' }]);

  const issues: Issue[] = [];
  const preview: PreviewRow[] = [];
  let rowsValid = 0;
  body.forEach((cells, index) => {
    const row = index + 1;
    const values = emptyValues();
    header.forEach((name, position) => {
      if ((CSV_COLUMNS as readonly string[]).includes(name)) {
        values[name as ColumnName] = cells[position] ?? '';
      }
    });
    const rowIssues: Issue[] = [];
    if (cells.length > header.length) {
      rowIssues.push({
        row,
        column: null,
        code: 'extra_cells',
        params: { expected: header.length },
      });
    }
    rowIssues.push(...validateRecord(values, row));
    if (rowIssues.length === 0) rowsValid += 1;
    issues.push(...rowIssues);
    if (preview.length < PREVIEW_ROWS) preview.push({ row, values });
  });
  return { format: 'csv', fatal: false, rowsTotal: body.length, rowsValid, issues, preview };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Property value as text. `null` (the GeoJSON missing marker) becomes an empty string. */
function propertyText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/** Mean of the ring vertices without the closing one, like the server. Null if the ring is bad. */
function centroid(geometry: unknown): { latitude: number; longitude: number } | null {
  if (!isRecord(geometry) || !Array.isArray(geometry.coordinates)) return null;
  let ring: unknown;
  if (geometry.type === 'Polygon') ring = geometry.coordinates[0];
  else if (geometry.type === 'MultiPolygon') {
    const first: unknown = geometry.coordinates[0];
    ring = Array.isArray(first) ? first[0] : undefined;
  } else return null;
  if (!Array.isArray(ring) || ring.length < 4) return null;
  const first: unknown = ring[0];
  const last: unknown = ring[ring.length - 1];
  if (JSON.stringify(first) !== JSON.stringify(last)) return null;
  let lonSum = 0;
  let latSum = 0;
  for (const point of ring.slice(0, -1) as unknown[]) {
    if (!Array.isArray(point) || point.length !== 2) return null;
    const [lon, lat] = point as unknown[];
    if (typeof lon !== 'number' || typeof lat !== 'number') return null;
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
    lonSum += lon;
    latSum += lat;
  }
  const count = ring.length - 1;
  const round = (value: number) => Math.round(value * 1e6) / 1e6;
  return { latitude: round(latSum / count), longitude: round(lonSum / count) };
}

export function validateGeoJsonText(text: string): ValidationReport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fatalReport('geojson', [{ row: 1, column: null, code: 'bad_json' }]);
  }
  if (!isRecord(data) || data.type !== 'FeatureCollection') {
    return fatalReport('geojson', [{ row: 1, column: 'type', code: 'not_feature_collection' }]);
  }
  if (!Array.isArray(data.features)) {
    return fatalReport('geojson', [{ row: 1, column: 'features', code: 'features_not_list' }]);
  }
  const features: unknown[] = data.features;
  if (features.length === 0)
    return fatalReport('geojson', [{ row: 1, column: null, code: 'no_rows' }]);

  const issues: Issue[] = [];
  const preview: PreviewRow[] = [];
  let rowsValid = 0;
  features.forEach((feature, index) => {
    const row = index + 1;
    if (!isRecord(feature) || feature.type !== 'Feature') {
      issues.push({ row, column: null, code: 'not_feature' });
      return;
    }
    const center = centroid(feature.geometry);
    const properties = isRecord(feature.properties) ? { ...feature.properties } : {};
    const values = emptyValues();
    if (center) {
      if (!('latitude' in properties)) properties.latitude = center.latitude;
      if (!('longitude' in properties)) properties.longitude = center.longitude;
    }
    for (const column of CSV_COLUMNS) values[column] = propertyText(properties[column]);
    const rowIssues: Issue[] = center ? [] : [{ row, column: 'geometry', code: 'geometry' }];
    if (center) rowIssues.push(...validateRecord(values, row));
    else
      rowIssues.push(
        ...validateRecord(values, row).filter(
          (i) => i.column !== 'latitude' && i.column !== 'longitude',
        ),
      );
    if (rowIssues.length === 0) rowsValid += 1;
    issues.push(...rowIssues);
    if (preview.length < PREVIEW_ROWS) preview.push({ row, values });
  });
  return {
    format: 'geojson',
    fatal: false,
    rowsTotal: features.length,
    rowsValid,
    issues,
    preview,
  };
}
