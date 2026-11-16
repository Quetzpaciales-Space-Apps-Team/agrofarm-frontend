import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { UploadResult } from '../../../services/types';
import { buildErrorReportCsv } from '../domain/csv';
import { downloadCsvFile } from './downloadCsv';
import { IssuesTable } from './IssuesTable';

/**
 * What the server answered. It says what was stored and what was not. It does not claim that
 * the data changed any result: uploaded data is not used by recommendations or the model yet.
 */
export const UploadSummary = forwardRef<
  HTMLHeadingElement,
  { result: UploadResult; onAnother: () => void }
>(function UploadSummary({ result, onAnother }, headingRef) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language);
  const lead =
    result.status === 'accepted'
      ? 'uploads.result.leadAccepted'
      : result.status === 'accepted_with_errors'
        ? 'uploads.result.leadPartial'
        : 'uploads.result.leadRejected';
  return (
    <section aria-label={t('uploads.result.region')} className="stack">
      <h4 ref={headingRef} tabIndex={-1}>
        {t(`uploads.result.${result.status}`)}
      </h4>
      <p>{t(lead)}</p>
      <dl className="facts upload-facts">
        <div>
          <dt>{t('uploads.result.file')}</dt>
          <dd>{result.filename}</dd>
        </div>
        <div>
          <dt>{t('uploads.result.format')}</dt>
          <dd>
            {t(
              result.format === 'csv' ? 'uploads.result.formatCsv' : 'uploads.result.formatGeojson',
            )}
          </dd>
        </div>
        <div>
          <dt>{t('uploads.result.rowsRead')}</dt>
          <dd>{number.format(result.rows_total)}</dd>
        </div>
        <div>
          <dt>{t('uploads.result.rowsStored')}</dt>
          <dd>{number.format(result.rows_accepted)}</dd>
        </div>
        <div>
          <dt>{t('uploads.result.rowsLeftOut')}</dt>
          <dd>{number.format(Math.max(0, result.rows_total - result.rows_accepted))}</dd>
        </div>
        <div>
          <dt>{t('uploads.result.problems')}</dt>
          <dd>{number.format(result.errors.length)}</dd>
        </div>
      </dl>
      {result.errors.length > 0 ? (
        <div className="stack">
          <IssuesTable
            caption={t('uploads.issues.serverCaption')}
            lines={result.errors.map((error) => ({
              row: error.row,
              column: error.column,
              text: error.message,
            }))}
          />
          <div className="upload-actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() =>
                downloadCsvFile('upload-error-report.csv', buildErrorReportCsv(result.errors))
              }
            >
              {t('uploads.result.downloadErrors')}
            </button>
          </div>
        </div>
      ) : null}
      <p>{t('uploads.result.kept')}</p>
      <p className="state state--warning">{t('uploads.result.notUsed')}</p>
      <button type="button" className="button button--secondary" onClick={onAnother}>
        {t('uploads.result.another')}
      </button>
    </section>
  );
});
