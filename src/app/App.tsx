import { AppShell } from '../components/AppShell';
import { SessionProvider } from '../features/auth/state/session';
import type { TokenStore } from '../infrastructure/api/auth';
import type { ApiClient } from '../infrastructure/api/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';
import { ApiProvider } from '../services/ApiContext';
import { ErrorBoundary } from './ErrorBoundary';

export interface AppProps {
  client: ApiClient;
  tokens: TokenStore;
}

export function App({ client, tokens }: AppProps) {
  return (
    <ApiProvider client={client} tokens={tokens}>
      <SessionProvider>
        <BrowserRouter>
          <AppShell>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </AppShell>
        </BrowserRouter>
      </SessionProvider>
    </ApiProvider>
  );
}
