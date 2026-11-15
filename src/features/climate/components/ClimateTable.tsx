import { useTranslation } from 'react-i18next';
import type { ClimateRow } from '../../../domain/chart';
import { formatMonth, formatValue } from '../../../domain/months';

export function ClimateTable({ rows, id }: { rows: ClimateRow[]; id: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const cell = (value: number | null, unit: string) =>
    formatValue(value, unit, locale, 1) ?? <span className="no-data">{t('climate.noData')}</span>;

  return (
    <div className="data-table-wrap" id={id}>
      <table>
        <caption>{t('climate.table.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('climate.table.month')}</th>
            <th scope="col">{t('climate.table.rain')}</th>
            <th scope="col">{t('climate.table.mean')}</th>
            <th scope="col">{t('climate.table.min')}</th>
            <th scope="col">{t('climate.table.max')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">{formatMonth(row.month, locale)}</th>
              <td>{cell(row.rainfall_mm, 'mm')}</td>
              <td>{cell(row.temperature_mean_c, '°C')}</td>
              <td>{cell(row.temperature_min_c, '°C')}</td>
              <td>{cell(row.temperature_max_c, '°C')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
