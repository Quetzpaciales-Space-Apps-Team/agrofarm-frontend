import { useTranslation } from 'react-i18next';
import { errorKey } from '../services/errors';

/** Shared loading and error views so every async view behaves the same way. */
export function LoadingState({ label }: { label: string }) {
  return (
    <p role="status" className="state state--loading">
      {label}
    </p>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="state state--error">
      <p>{t(errorKey(error))}</p>
      <button type="button" className="button button--secondary" onClick={onRetry}>
        {t('common.retry')}
      </button>
    </div>
  );
}

export function EmptyState({ children }: { children: string }) {
  return <p className="state state--empty">{children}</p>;
}
