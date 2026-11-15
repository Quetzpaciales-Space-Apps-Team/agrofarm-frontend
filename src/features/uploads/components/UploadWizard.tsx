import { useEffect, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatFileSize } from '../domain/format';
import { TEMPLATE_FILENAME, buildTemplateCsv } from '../domain/schema';
import type { Issue } from '../domain/validate';
import { useUploadWizard, type Stage } from '../hooks/useUploadWizard';
import { IssuesTable } from './IssuesTable';
import { PreviewTable } from './PreviewTable';
import { UploadSummary } from './UploadSummary';
import '../uploads.css';

const STEP_OF: Record<Stage, Stage> = {
  template: 'template',
  choose: 'choose',
  review: 'review',
  sending: 'review',
  result: 'result',
};
const STEP_KEYS = ['template', 'choose', 'review', 'send', 'result'] as const;
const STEP_INDEX: Record<Stage, number> = {
  template: 0,
  choose: 1,
  review: 2,
  sending: 3,
  result: 4,
};

function downloadTemplate() {
  const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = TEMPLATE_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function UploadWizard({ farmId }: { farmId: string }) {
  const { t, i18n } = useTranslation();
  const wizard = useUploadWizard(farmId);
  const { stage, file, report, problem, reading, result, sendError } = wizard;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new step heading, but not when the dashboard first shows the wizard.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stage]);

  const issueLines = (issues: Issue[]) =>
    issues.map((issue) => ({
      row: issue.row,
      column: issue.column,
      text: t(`uploads.rule.${issue.code}`, issue.params ?? {}),
    }));

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (picked) void wizard.chooseFile(picked);
  };

  const rowsInvalid = report ? report.rowsTotal - report.rowsValid : 0;
  const status = (() => {
    if (stage === 'choose' && reading && file === null)
      return t('uploads.choose.reading', { name: '' }).trim();
    if (stage === 'choose' && report?.fatal) {
      return t('uploads.choose.cannotSend', { count: report.issues.length });
    }
    if (stage === 'review' && report) {
      return t('uploads.review.rowsRead', {
        count: report.rowsTotal,
        valid: report.rowsValid,
        invalid: rowsInvalid,
      });
    }
    if (stage === 'sending' && file) {
      return t('uploads.sending.status', {
        name: file.name,
        size: formatFileSize(file.size, i18n.language),
      });
    }
    if (stage === 'result' && result) {
      return t('uploads.result.statusLine', { status: t(`uploads.result.${result.status}`) });
    }
    return '';
  })();

  const heading = (key: string) => (
    <h4 ref={headingRef} tabIndex={-1}>
      {t(key)}
    </h4>
  );

  return (
    <section aria-labelledby="upload-title" className="card stack upload-wizard">
      <h3 id="upload-title">{t('uploads.title')}</h3>
      <p>{t('uploads.intro')}</p>
      <p role="note" className="state state--warning upload-note">
        {t('uploads.notice')}
      </p>
      <ol className="upload-steps" aria-label={t('uploads.steps.label')}>
        {STEP_KEYS.map((key, index) => (
          <li key={key} aria-current={index === STEP_INDEX[STEP_OF[stage]] ? 'step' : undefined}>
            {t(`uploads.steps.${key}`)}
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="upload-status">
        {status}
      </p>

      {stage === 'template' ? (
        <div className="stack">
          {heading('uploads.template.heading')}
          <p>{t('uploads.template.body')}</p>
          <p>{t('uploads.template.columns')}</p>
          <p>{t('uploads.template.examples')}</p>
          <div className="upload-actions">
            <button type="button" className="button button--secondary" onClick={downloadTemplate}>
              {t('uploads.template.download')}
            </button>
            <button type="button" className="button" onClick={wizard.goToChoose}>
              {t('uploads.template.continue')}
            </button>
          </div>
        </div>
      ) : null}

      {stage === 'choose' ? (
        <div className="stack">
          {heading('uploads.choose.heading')}
          <div className="field">
            <label htmlFor="upload-file">{t('uploads.choose.label')}</label>
            <input
              id="upload-file"
              type="file"
              accept=".csv,.geojson,.json,text/csv,application/geo+json,application/json"
              aria-describedby="upload-file-hint"
              onChange={onPick}
            />
            <small id="upload-file-hint">{t('uploads.choose.hint')}</small>
          </div>
          {problem ? (
            <p role="alert" className="state state--error">
              {problem.kind === 'size'
                ? t('uploads.fileProblem.size', {
                    size: formatFileSize(problem.bytes, i18n.language),
                  })
                : t(`uploads.fileProblem.${problem.kind}`)}
            </p>
          ) : null}
          {report?.fatal ? (
            <>
              <p role="alert" className="state state--error">
                {t('uploads.choose.cannotSend', { count: report.issues.length })}
              </p>
              <IssuesTable
                caption={t('uploads.issues.clientCaption')}
                lines={issueLines(report.issues)}
              />
            </>
          ) : null}
          <div className="upload-actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={wizard.goToTemplate}
            >
              {t('uploads.choose.back')}
            </button>
          </div>
        </div>
      ) : null}

      {(stage === 'review' || stage === 'sending') && report && file ? (
        <div className="stack">
          {stage === 'review'
            ? heading('uploads.review.heading')
            : heading('uploads.sending.heading')}
          <p>
            {t('uploads.review.fileLine', {
              name: file.name,
              size: formatFileSize(file.size, i18n.language),
            })}
          </p>
          {stage === 'sending' ? (
            <>
              <progress aria-label={t('uploads.sending.progress')} className="upload-progress" />
              <p>{t('uploads.sending.note')}</p>
            </>
          ) : (
            <>
              <p>{t('uploads.review.clientNote')}</p>
              {sendError ? (
                <div role="alert" className="state state--error">
                  <p>{t(sendError.key, sendError.params)}</p>
                  {sendError.maybeStored ? <p>{t('uploads.error.maybeStored')}</p> : null}
                  <p>{t('uploads.error.retry')}</p>
                </div>
              ) : null}
              {report.issues.length > 0 ? (
                <IssuesTable
                  caption={t('uploads.issues.clientCaption')}
                  lines={issueLines(report.issues)}
                />
              ) : null}
              <p>{t('uploads.review.previewHint')}</p>
              <PreviewTable rows={report.preview} />
              {report.rowsValid === 0 ? <p>{t('uploads.review.noneSendable')}</p> : null}
              <div className="upload-actions">
                {report.rowsValid > 0 ? (
                  <button type="button" className="button" onClick={() => void wizard.send()}>
                    {t('uploads.review.send')}
                  </button>
                ) : null}
                <button type="button" className="button button--secondary" onClick={wizard.reset}>
                  {t('uploads.review.another')}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {stage === 'result' && result ? (
        <UploadSummary ref={headingRef} result={result} onAnother={wizard.reset} />
      ) : null}
    </section>
  );
}
