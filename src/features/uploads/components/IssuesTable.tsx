import { useTranslation } from 'react-i18next';

export interface IssueLine {
  row: number;
  column: string | null;
  text: string;
}

export const MAX_ISSUES_SHOWN = 100;

/** Problems by row and column. Used for the browser check and for the server answer. */
export function IssuesTable({ caption, lines }: { caption: string; lines: IssueLine[] }) {
  const { t } = useTranslation();
  const shown = lines.slice(0, MAX_ISSUES_SHOWN);
  return (
    <div className="upload-table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table className="upload-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t('uploads.issues.row')}</th>
            <th scope="col">{t('uploads.issues.column')}</th>
            <th scope="col">{t('uploads.issues.problem')}</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((line, index) => (
            <tr key={`${line.row}-${line.column ?? ''}-${index}`}>
              <th scope="row">{line.row}</th>
              <td>{line.column ?? t('uploads.issues.wholeFile')}</td>
              <td>{line.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lines.length > shown.length ? (
        <p>{t('uploads.issues.truncated', { shown: shown.length, total: lines.length })}</p>
      ) : null}
    </div>
  );
}
