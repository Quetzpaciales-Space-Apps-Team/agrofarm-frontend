import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './i18n';
import { createTokenStore } from './infrastructure/api/auth';
import { createApiClient } from './infrastructure/api/client';
import { loadRuntimeConfig } from './infrastructure/api/config';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}
const root = createRoot(rootElement);

async function bootstrap() {
  const config = await loadRuntimeConfig();
  if (config.useMocks) {
    const { startMockWorker } = await import('./mocks/browser');
    await startMockWorker();
  }
  const tokens = createTokenStore();
  const client = createApiClient({ baseUrl: config.apiBaseUrl, tokens });
  root.render(
    <StrictMode>
      <App client={client} tokens={tokens} />
    </StrictMode>,
  );
}

void bootstrap();
