import { describe, expect, it } from 'vitest';
import { parseCsv } from '../domain/csv';
import { CSV_COLUMNS, MAX_FILE_BYTES, TEMPLATE_FILENAME, buildTemplateCsv } from '../domain/schema';
import { validateCsvText } from '../domain/validate';

describe('template', () => {
  it('has every column of the upload schema in order, as the first row', () => {
    const [header] = parseCsv(buildTemplateCsv()).rows;
    expect(header).toEqual([
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
    ]);
    expect(header).toEqual([...CSV_COLUMNS]);
  });

  it('passes its own validation with no issues, keeping empty cells empty', () => {
    const report = validateCsvText(buildTemplateCsv());
    expect(report.issues).toEqual([]);
    expect(report.rowsTotal).toBeGreaterThan(0);
    expect(report.rowsValid).toBe(report.rowsTotal);
    const pending = report.preview.find((r) => r.values.parcel_id === 'parcel_02');
    expect(pending?.values.harvest_date).toBe('');
    expect(pending?.values.yield_kg_ha).toBe('');
  });

  it('has a csv file name and the size limit stays under the 2 MB server limit', () => {
    expect(TEMPLATE_FILENAME).toMatch(/\.csv$/);
    expect(MAX_FILE_BYTES).toBeLessThan(2 * 1024 * 1024);
    expect(MAX_FILE_BYTES).toBeGreaterThan(2 * 1024 * 1024 - 4096);
  });
});
