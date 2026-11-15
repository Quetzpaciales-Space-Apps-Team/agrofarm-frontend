import { useTranslation } from 'react-i18next';
import { CSV_COLUMNS } from '../domain/schema';
import type { PreviewRow } from '../domain/validate';

/** First rows as the browser read them. An empty cell is shown as empty, never as zero. */
export function PreviewTable({ rows }: { rows: PreviewRow[] }) {
  const { t } = useTranslation();
  return (
    <div
      className="upload-table-wrap"
      tabIndex={0}
      role="region"
      aria-label={t('uploads.review.previewCaption', { count: rows.length })}
    >
      <table className="upload-table">
        <caption>{t('uploads.review.previewCaption', { count: rows.length })}</caption>
        <thead>
          <tr>
            <th scope="col">{t('uploads.review.rowColumn')}</th>
            {CSV_COLUMNS.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ row, values }) => (
            <tr key={row}>
              <th scope="row">{row}</th>
              {CSV_COLUMNS.map((column) => (
                <td key={column}>
                  {values[column] === '' ? (
                    <span className="upload-empty">{t('uploads.review.empty')}</span>
                  ) : (
                    values[column]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
