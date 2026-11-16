import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { startDemoSession } from '../services/api';
import { useApi } from '../services/ApiContext';
import { isUnauthorizedError, panelErrorKey } from '../services/errors';
import './PanelState.css';

const COLD_START_MS = 3000;

/** Loading banner that surfaces a cold-start message if a request exceeds 3 seconds. */
export function PanelLoadingState({ label }: { label: string }) {
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), COLD_START_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div role="status" className="state state--loading panel-state-loading">
      <span>{label}</span>
      {slow ? <span className="panel-state-slow">{t('panelState.wakingUp')}</span> : null}
    </div>
  );
}

/** Actionable error banner with a one-click demo restart on 401. */
export function PanelErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  const { client, tokens } = useApi();
  const [restarting, setRestarting] = useState(false);
  const [restartFailed, setRestartFailed] = useState(false);
  const unauthorized = isUnauthorizedError(error);

  const restartDemo = async () => {
    setRestarting(true);
    setRestartFailed(false);
    try {
      const session = await startDemoSession(client);
      tokens.set(session.access_token);
      onRetry();
    } catch {
      setRestartFailed(true);
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div role="alert" className="state state--error panel-state-error">
      <p>{t(panelErrorKey(error))}</p>
      {restartFailed ? <p>{t('auth.demo.failed')}</p> : null}
      <div className="panel-state-actions">
        {unauthorized ? (
          <button
            type="button"
            className="button"
            disabled={restarting}
            onClick={() => void restartDemo()}
          >
            {restarting ? t('landing.starting') : t('panelState.startNewDemo')}
          </button>
        ) : null}
        <button type="button" className="button button--secondary" onClick={onRetry}>
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}

export function PanelEmptyState({ children }: { children: string }) {
  return <p className="state state--empty">{children}</p>;
}
