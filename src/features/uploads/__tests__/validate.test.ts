import { describe, expect, it } from 'vitest';
import { CSV_COLUMNS } from '../domain/schema';
import { validateCsvText, validateGeoJsonText, validateRecord } from '../domain/validate';

const HEADER = CSV_COLUMNS.join(',');
const GOOD =
  'p_1,2025,maize,2025-05-15,2025-10-20,2.5,14.5892,-90.5315,3200,rainfed,6.2,3.1,42,18.5,165,980.5,ok';
const csv = (...rows: string[]) => [HEADER, ...rows].join('\n');
const byColumn = (issues: { column: string | null }[]) => issues.map((i) => i.column);

describe('validateCsvText', () => {
  it('accepts a good row', () => {
    const report = validateCsvText(csv(GOOD));
    expect(report).toMatchObject({ format: 'csv', fatal: false, rowsTotal: 1, rowsValid: 1 });
    expect(report.issues).toEqual([]);
  });

  it('rejects the whole file when required columns are missing, naming each one', () => {
    const report = validateCsvText('parcel_id,crop\np1,maize\n');
    expect(report.fatal).toBe(true);
    const missing = report.issues.filter((i) => i.code === 'missing_column').map((i) => i.column);
    expect(missing).toEqual(['season_year', 'sowing_date', 'area_ha', 'latitude', 'longitude']);
  });

  it('rejects an empty file and a header-only file', () => {
    expect(validateCsvText('').fatal).toBe(true);
    const headerOnly = validateCsvText(HEADER + '\n');
    expect(headerOnly.fatal).toBe(true);
    expect(headerOnly.issues[0]?.code).toBe('no_rows');
  });

  it('reports row-level issues by data row number and column (row 1 is the first data row)', () => {
    const bad = 'bad id!,1800,maize,15/05/2025,,0,95,-90.5,-5,flood,11,101,-1,,,-3,x';
    const report = validateCsvText(csv(GOOD, bad));
    expect(report.rowsTotal).toBe(2);
    expect(report.rowsValid).toBe(1);
    expect(report.issues.every((i) => i.row === 2)).toBe(true);
    expect(byColumn(report.issues)).toEqual([
      'parcel_id',
      'season_year',
      'sowing_date',
      'area_ha',
      'latitude',
      'yield_kg_ha',
      'soil_ph',
      'soil_om_pct',
      'soil_n_mg_kg',
      'rainfall_season_mm',
      'irrigation',
    ]);
  });

  it('flags the docs invalid example and still lets the preview show the row', () => {
    const invalid =
      HEADER +
      '\n,2024,maize,15/05/2024,2024-04-01,-1.0,95.0,-90.5315,-50,unknown_method,12.5,3.1,,,,,note\n';
    const report = validateCsvText(invalid);
    expect(report.rowsValid).toBe(0);
    expect(byColumn(report.issues)).toEqual([
      'parcel_id',
      'sowing_date',
      'area_ha',
      'latitude',
      'yield_kg_ha',
      'soil_ph',
      'irrigation',
    ]);
    expect(report.preview).toHaveLength(1);
  });

  it('checks harvest_date is not before sowing_date', () => {
    const row = GOOD.replace('2025-10-20', '2025-01-01');
    expect(validateCsvText(csv(row)).issues).toEqual([
      expect.objectContaining({ row: 1, column: 'harvest_date', code: 'harvest_before_sowing' }),
    ]);
  });

  it('rejects impossible calendar dates', () => {
    const row = GOOD.replace('2025-05-15', '2025-02-30');
    expect(validateCsvText(csv(row)).issues[0]).toMatchObject({
      column: 'sowing_date',
      code: 'date_invalid',
    });
  });

  it('treats empty optional cells as missing, never as zero', () => {
    const row = 'p_1,2025,fallow,2025-05-15,,2.5,14.5,-90.5,,,,,,,,,';
    const report = validateCsvText(csv(row));
    expect(report.issues).toEqual([]);
    expect(report.preview[0]?.values.yield_kg_ha).toBe('');
    expect(report.preview[0]?.values.soil_ph).toBe('');
  });

  it('reports an empty required cell as required, not as zero', () => {
    const row = 'p_1,2025,maize,2025-05-15,,,14.5,-90.5,,,,,,,,,';
    expect(validateCsvText(csv(row)).issues).toEqual([
      expect.objectContaining({ column: 'area_ha', code: 'required' }),
    ]);
  });

  it('rejects sentinel values and decimal commas instead of reading them as data', () => {
    const sentinel = GOOD.replace(',3200,', ',-999,');
    expect(validateCsvText(csv(sentinel)).issues[0]).toMatchObject({ column: 'yield_kg_ha' });
    const comma = GOOD.replace(',2.5,', ',"2,5",');
    expect(validateCsvText(csv(comma)).issues[0]).toMatchObject({
      column: 'area_ha',
      code: 'number',
    });
  });

  it('does not accept text that JavaScript Number() would read as a number', () => {
    for (const value of ['0x10', 'Infinity', 'NaN', '1e999', ' ', '1_000']) {
      const issues = validateRecord(
        {
          ...Object.fromEntries(CSV_COLUMNS.map((c) => [c, ''])),
          parcel_id: 'p',
          season_year: '2025',
          crop: 'maize',
          sowing_date: '2025-05-15',
          area_ha: value,
          latitude: '1',
          longitude: '1',
        },
        1,
      );
      expect(issues.map((i) => i.column)).toContain('area_ha');
    }
  });

  it('keeps quoted cells with commas and quotes intact, and limits notes to 500 characters', () => {
    const quoted = GOOD.replace(',ok', ',"north, ""east"" plot"');
    expect(validateCsvText(csv(quoted)).preview[0]?.values.notes).toBe('north, "east" plot');
    const long = GOOD.replace(',ok', `,${'x'.repeat(501)}`);
    expect(validateCsvText(csv(long)).issues[0]).toMatchObject({
      column: 'notes',
      code: 'too_long',
    });
  });

  it('flags a row with more cells than the header', () => {
    expect(validateCsvText(csv(GOOD + ',extra')).issues[0]).toMatchObject({
      row: 1,
      column: null,
      code: 'extra_cells',
    });
  });

  it('reports an unterminated quote as a file problem', () => {
    const report = validateCsvText(csv('"open,2'));
    expect(report.fatal).toBe(true);
    expect(report.issues[0]?.code).toBe('unterminated_quote');
  });

  it('limits the preview to the first rows', () => {
    const report = validateCsvText(csv(...Array.from({ length: 12 }, () => GOOD)));
    expect(report.rowsTotal).toBe(12);
    expect(report.preview).toHaveLength(5);
  });
});

const feature = (properties: Record<string, unknown>, ring?: number[][]) => ({
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      ring ?? [
        [-90.5325, 14.5885],
        [-90.5305, 14.5885],
        [-90.5305, 14.59],
        [-90.5325, 14.59],
        [-90.5325, 14.5885],
      ],
    ],
  },
  properties,
});
const PROPS = {
  parcel_id: 'p_1',
  season_year: 2025,
  crop: 'maize',
  sowing_date: '2025-05-15',
  area_ha: 2.5,
};
const collection = (...features: unknown[]) =>
  JSON.stringify({ type: 'FeatureCollection', features });

describe('validateGeoJsonText', () => {
  it('accepts a feature and derives latitude and longitude from the polygon', () => {
    const report = validateGeoJsonText(collection(feature({ ...PROPS, yield_kg_ha: null })));
    expect(report).toMatchObject({ format: 'geojson', fatal: false, rowsTotal: 1, rowsValid: 1 });
    expect(report.preview[0]?.values.latitude).toBe('14.58925');
    expect(report.preview[0]?.values.yield_kg_ha).toBe('');
  });

  it('rejects text that is not JSON or not a FeatureCollection', () => {
    expect(validateGeoJsonText('{nope').issues[0]?.code).toBe('bad_json');
    expect(validateGeoJsonText('{"type":"Feature"}').issues[0]?.code).toBe(
      'not_feature_collection',
    );
    expect(validateGeoJsonText('{"type":"FeatureCollection","features":3}').issues[0]?.code).toBe(
      'features_not_list',
    );
  });

  it('reports bad geometry and bad properties by feature number', () => {
    const open = feature(PROPS, [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    const report = validateGeoJsonText(
      collection(feature(PROPS), open, feature({ ...PROPS, area_ha: -2, crop: '' }), 'nope'),
    );
    expect(report.rowsTotal).toBe(4);
    expect(report.rowsValid).toBe(1);
    expect(report.issues.map((i) => [i.row, i.column])).toEqual([
      [2, 'geometry'],
      [3, 'crop'],
      [3, 'area_ha'],
      [4, null],
    ]);
  });
});
