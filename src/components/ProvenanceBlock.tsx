import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { isStubModel } from '../domain/scenario';
import type { Provenance } from '../services/types';

/** FE-306: model name and version, data versions, generation time, and a plain note for stub models. */
export function ProvenanceBlock({
  provenance,
  disclaimer,
}: {
  provenance: Provenance;
  disclaimer?: string;
}) {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const generated = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(provenance.generated_at));
  const versions = Object.entries(provenance.data_versions);

  return (
    <section aria-labelledby={titleId} className="source">
      <h4 id={titleId}>{t('provenance.title')}</h4>
      {isStubModel(provenance.model_name) ? (
        <p className="state state--warning">{t('provenance.stubNotice')}</p>
      ) : null}
      <dl>
        <dt>{t('provenance.model')}</dt>
        <dd>{provenance.model_name}</dd>
        <dt>{t('provenance.version')}</dt>
        <dd>{provenance.model_version}</dd>
        <dt>{t('provenance.data')}</dt>
        <dd>
          {versions.length === 0 ? (
            t('provenance.noData')
          ) : (
            <ul className="plain-list">
              {versions.map(([name, version]) => (
                <li key={name}>{t('provenance.dataItem', { name, version })}</li>
              ))}
            </ul>
          )}
        </dd>
        <dt>{t('provenance.generated')}</dt>
        <dd>{t('provenance.generatedAt', { date: generated })}</dd>
        {disclaimer ? (
          <>
            <dt>{t('provenance.disclaimer')}</dt>
            <dd>{disclaimer}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
