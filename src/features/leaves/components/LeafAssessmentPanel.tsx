import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../../services/ApiContext';
import { errorKey } from '../../../services/errors';
import { assessLeaf, isHttps, LEAF_CLASSES, type LeafAssessment } from '../../../services/leaves';

export function LeafAssessmentPanel({ farmId }: { farmId: string }) {
  const { t, i18n } = useTranslation();
  const { client } = useApi();
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState<LeafAssessment | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const control = useRef<AbortController | null>(null);
  const active = useRef(0);
  const photoUrl = useRef('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      control.current?.abort();
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    },
    [],
  );

  function select(next: File | null) {
    control.current?.abort();
    active.current++;
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = '';
    setPreview('');
    setResult(null);
    setError('');
    setBusy(false);
    setFile(null);
    if (!next) {
      if (input.current) input.current.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(next.type)) {
      setError('leaf.errors.type');
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setError('leaf.errors.size');
      return;
    }
    photoUrl.current = URL.createObjectURL(next);
    setPreview(photoUrl.current);
    setFile(next);
  }

  async function submit() {
    if (!file || busy) return;
    const version = ++active.current;
    const abort = new AbortController();
    control.current = abort;
    setBusy(true);
    setResult(null);
    setError('');
    try {
      const data = await assessLeaf(client, farmId, file, abort.signal);
      if (version === active.current) setResult(data);
    } catch (reason) {
      if (!abort.signal.aborted && version === active.current) {
        const key = errorKey(reason);
        setError(key === 'errors.unavailable' ? 'leaf.errors.unavailable' : key);
      }
    } finally {
      if (version === active.current) setBusy(false);
    }
  }

  const score = (value: number) =>
    new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(value * 100);
  return (
    <section className="card stack" aria-labelledby={`${id}-title`}>
      <div>
        <h3 id={`${id}-title`}>{t('leaf.title')}</h3>
        <p>{t('leaf.intro')}</p>
      </div>
      <p className="review-note">{t('leaf.review')}</p>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="field">
          <label htmlFor={`${id}-file`}>{t('leaf.choose')}</label>
          <input
            ref={input}
            id={`${id}-file`}
            type="file"
            accept="image/jpeg,image/png"
            aria-describedby={`${id}-privacy`}
            onChange={(event) => select(event.target.files?.[0] ?? null)}
          />
          <span id={`${id}-privacy`}>{t('leaf.privacy')}</span>
        </div>
        {preview && (
          <figure className="leaf-preview">
            <img src={preview} alt={t('leaf.preview')} />
            <figcaption>{file?.name}</figcaption>
          </figure>
        )}
        <div className="toolbar">
          <button className="button" type="submit" disabled={!file || busy}>
            {t(busy ? 'leaf.working' : 'leaf.submit')}
          </button>
          {file && (
            <button className="button button--secondary" type="button" onClick={() => select(null)}>
              {t('leaf.clear')}
            </button>
          )}
        </div>
      </form>
      {busy && <p role="status">{t('leaf.working')}</p>}
      {error && <p role="alert">{t(error)}</p>}
      <div aria-live="polite">
        {result && (
          <div className="stack">
            <h4>
              {result.assessment === 'uncertain' || !result.candidate
                ? t('leaf.uncertain')
                : t('leaf.possible', { condition: t(`leaf.classes.${result.candidate}`) })}
            </h4>
            <p>{t('leaf.scoresNote')}</p>
            <div className="table-scroll">
              <table>
                <caption>{t('leaf.scores')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('leaf.condition')}</th>
                    <th scope="col">{t('leaf.score')}</th>
                  </tr>
                </thead>
                <tbody>
                  {LEAF_CLASSES.map((name) => (
                    <tr key={name}>
                      <th scope="row">{t(`leaf.classes.${name}`)}</th>
                      <td>{score(result.scores[name])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h4>{t('leaf.next')}</h4>
            <ul>
              {result.guidance.next_steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <p>{t('leaf.guidanceNote')}</p>
            <ul>
              {result.guidance.sources
                .filter((source) => isHttps(source.url))
                .map((source, index) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {t('leaf.reference', { number: index + 1 })}
                    </a>
                  </li>
                ))}
            </ul>
            <details>
              <summary>{t('leaf.limits')}</summary>
              <ul>
                {result.limits.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </details>
            <p>{t('leaf.model', { version: result.provenance.model_version })}</p>
            <p className="review-note">{result.disclaimer}</p>
          </div>
        )}
      </div>
    </section>
  );
}
