import { AppShell } from '../components/AppShell';
import { SessionProvider, useSession } from '../features/auth/state/session';
import type { TokenStore } from '../infrastructure/api/auth';
import type { ApiClient } from '../infrastructure/api/client';
import { DashboardPage } from '../pages/DashboardPage';
import { LandingPage } from '../pages/LandingPage';
import { ApiProvider } from '../services/ApiContext';
import { ErrorBoundary } from './ErrorBoundary';

export interface AppProps {
  client: ApiClient;
  tokens: TokenStore;
}

/** A tiny state-based view switch: the session decides between landing and dashboard (no router library). */
function Views() {
  const { status, farmId, leave } = useSession();
  return status === 'active' && farmId ? (
    <DashboardPage farmId={farmId} onLeave={leave} />
  ) : (
    <LandingPage />
  );
}

export function App({ client, tokens }: AppProps) {
  return (
    <ApiProvider client={client} tokens={tokens}>
      <SessionProvider>
        <AppShell>
          <ErrorBoundary>
            <Views />
          </ErrorBoundary>
        </AppShell>
      </SessionProvider>
    </ApiProvider>
  );
}
