import { AppShell } from '../components/AppShell';
import { Redirect } from '../components/Redirect';
import { RequireAuth } from '../features/auth/components/RequireAuth';
import { SessionProvider, useSession } from '../features/auth/state/session';
import type { TokenStore } from '../infrastructure/api/auth';
import type { ApiClient } from '../infrastructure/api/client';
import { AccountPage } from '../pages/AccountPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ApiProvider } from '../services/ApiContext';
import { useRoute } from '../services/navigation';
import { ErrorBoundary } from './ErrorBoundary';

export interface AppProps {
  client: ApiClient;
  tokens: TokenStore;
}

function FarmArea() {
  const { farmId, isDemoGuest, leave } = useSession();
  return farmId ? (
    <DashboardPage farmId={farmId} onLeave={leave} isDemoGuest={isDemoGuest} />
  ) : (
    <AccountPage />
  );
}

function Views() {
  const { status } = useSession();
  const { path, next } = useRoute();
  if (['/farm', '/data', '/scenarios', '/recommendations', '/climate'].includes(path)) {
    return (
      <RequireAuth>
        <FarmArea />
      </RequireAuth>
    );
  }
  if (status === 'active') return <Redirect to={path === '/' ? '/farm' : (next ?? '/farm')} />;
  if (path === '/login') return <LoginPage />;
  if (path === '/register') return <RegisterPage />;
  return <LandingPage />;
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
