import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchFarmIds,
  fetchMe,
  loginAccount,
  logoutAccount,
  registerAccount,
  startDemoSession,
} from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import { demoErrorKey } from '../../../services/errors';
import { navigate } from '../../../services/navigation';
import type { LoginRequest, RegisterRequest, User } from '../../../services/types';

export type SessionStatus = 'anonymous' | 'starting' | 'active' | 'error';

interface SessionState {
  status: SessionStatus;
  farmId: string | null;
  isDemoGuest: boolean;
  errorKey: string | null;
  user: User | null;
  /** True while the app asks the refresh cookie for a session on start. The visitor is not blocked. */
  restoring: boolean;
}

interface SessionValue extends SessionState {
  startDemo: () => Promise<void>;
  /** Rejects with the `ApiError` of the failed call; the form turns it into a message. */
  login: (input: LoginRequest) => Promise<void>;
  /**
   * Creates the account, then logs in with the same credentials. Resolves `true` when logged in and
   * `false` when the account exists but the login step failed. Rejects when the account was not created.
   */
  register: (input: RegisterRequest) => Promise<boolean>;
  /** Clears the session at once, then tells the API to revoke the refresh cookie. */
  logout: () => Promise<void>;
  /** Same as `logout`, for callers that do not wait for the API. */
  leave: () => void;
  /** Selects which farm is active in the session. */
  selectFarm: (farmId: string) => void;
  /** Reloads user profile and farm list from the API. */
  reloadAccount: () => Promise<void>;
}

const ANONYMOUS: SessionState = {
  status: 'anonymous',
  farmId: null,
  isDemoGuest: false,
  errorKey: null,
  user: null,
  restoring: false,
};

/** Demo guests are created by the API with this reserved address (docs/contract/frontend-migration.md). */
const isDemoUser = (user: User) => user.email.endsWith('@demo.agrofarm.invalid');

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Session in memory only. The access token sits in the token store (a closure), the rest in React
 * state. Nothing goes to web storage; the refresh token is an httpOnly cookie the page cannot read.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { client, tokens } = useApi();
  const [state, setState] = useState<SessionState>({ ...ANONYMOUS, restoring: true });
  // Every new session action bumps this; a slower, older action then drops its result.
  const epoch = useRef(0);

  /** Loads who the user is and which farm to show, after a token was stored. */
  const loadAccount = useCallback(async () => {
    const [user, farmIds] = await Promise.all([fetchMe(client), fetchFarmIds(client)]);
    return { user, farmId: farmIds[0] ?? null };
  }, [client]);

  useEffect(() => {
    const run = ++epoch.current;
    const settle = (next: SessionState) => {
      if (epoch.current === run) setState(next);
    };
    void (async () => {
      try {
        const token = await client.refresh();
        if (!token || epoch.current !== run) return settle({ ...ANONYMOUS });
        tokens.set(token);
        const { user, farmId } = await loadAccount();
        settle({
          status: 'active',
          farmId,
          isDemoGuest: isDemoUser(user),
          errorKey: null,
          user,
          restoring: false,
        });
      } catch {
        if (epoch.current === run) tokens.clear();
        settle({ ...ANONYMOUS });
      }
    })();
  }, [client, tokens, loadAccount]);

  // A 401 that could not be refreshed: the session is over, go to login and keep the path.
  useEffect(
    () =>
      client.onSessionExpired(() => {
        // Only a signed-in session can expire; a failed restore or demo start has its own handling.
        setState((current) => (current.status === 'active' ? ANONYMOUS : current));
      }),
    [client],
  );

  const startDemo = useCallback(async () => {
    const run = ++epoch.current;
    setState({ ...ANONYMOUS, status: 'starting' });
    try {
      const session = await startDemoSession(client);
      if (epoch.current !== run) return;
      tokens.set(session.access_token);
      setState({
        ...ANONYMOUS,
        status: 'active',
        farmId: session.farm_id,
        isDemoGuest: session.is_demo_guest,
      });
    } catch (error) {
      if (epoch.current !== run) return;
      tokens.clear();
      setState({ ...ANONYMOUS, status: 'error', errorKey: demoErrorKey(error) });
    }
  }, [client, tokens]);

  const login = useCallback(
    async (input: LoginRequest) => {
      const run = ++epoch.current;
      const { access_token } = await loginAccount(client, input);
      tokens.set(access_token);
      try {
        const { user, farmId } = await loadAccount();
        if (epoch.current !== run) return;
        setState({ ...ANONYMOUS, status: 'active', farmId, user, isDemoGuest: isDemoUser(user) });
      } catch (error) {
        tokens.clear();
        throw error;
      }
    },
    [client, tokens, loadAccount],
  );

  const register = useCallback(
    async (input: RegisterRequest) => {
      await registerAccount(client, input);
      try {
        await login({ email: input.email, password: input.password });
        return true;
      } catch {
        return false;
      }
    },
    [client, login],
  );

  const logout = useCallback(async () => {
    epoch.current += 1;
    tokens.clear();
    setState(ANONYMOUS);
    navigate('/');
    try {
      await logoutAccount(client);
    } catch {
      // The local session is already gone; the refresh cookie expires on its own.
    }
  }, [client, tokens]);

  const leave = useCallback(() => {
    void logout();
  }, [logout]);

  const selectFarm = useCallback((farmId: string) => {
    setState((current) => ({ ...current, farmId }));
  }, []);

  const reloadAccount = useCallback(async () => {
    try {
      const { user, farmId } = await loadAccount();
      setState((current) => ({
        ...current,
        user,
        farmId: current.farmId ?? farmId,
      }));
    } catch {
      // Retain current session state on transient network error
    }
  }, [loadAccount]);

  const value = useMemo(
    () => ({ ...state, startDemo, login, register, logout, leave, selectFarm, reloadAccount }),
    [state, startDemo, login, register, logout, leave, selectFarm, reloadAccount],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>.');
  return value;
}
