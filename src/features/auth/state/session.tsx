import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { startDemoSession } from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import { demoErrorKey } from '../../../services/errors';

export type SessionStatus = 'anonymous' | 'starting' | 'active' | 'error';

interface SessionState {
  status: SessionStatus;
  farmId: string | null;
  isDemoGuest: boolean;
  errorKey: string | null;
}

interface SessionValue extends SessionState {
  startDemo: () => Promise<void>;
  leave: () => void;
}

const ANONYMOUS: SessionState = {
  status: 'anonymous',
  farmId: null,
  isDemoGuest: false,
  errorKey: null,
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Session in memory only. The access token sits in the token store (a closure),
 * `farm_id` and `is_demo_guest` in React state. Nothing goes to web storage.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { client, tokens } = useApi();
  const [state, setState] = useState<SessionState>(ANONYMOUS);

  const startDemo = useCallback(async () => {
    setState({ ...ANONYMOUS, status: 'starting' });
    try {
      const session = await startDemoSession(client);
      tokens.set(session.access_token);
      setState({
        status: 'active',
        farmId: session.farm_id,
        isDemoGuest: session.is_demo_guest,
        errorKey: null,
      });
    } catch (error) {
      tokens.clear();
      setState({ ...ANONYMOUS, status: 'error', errorKey: demoErrorKey(error) });
    }
  }, [client, tokens]);

  const leave = useCallback(() => {
    tokens.clear();
    setState(ANONYMOUS);
  }, [tokens]);

  const value = useMemo(() => ({ ...state, startDemo, leave }), [state, startDemo, leave]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>.');
  return value;
}
