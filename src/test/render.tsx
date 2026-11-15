import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createTokenStore, type TokenStore } from '../infrastructure/api/auth';
import { createApiClient, type ApiClient } from '../infrastructure/api/client';

export const TEST_BASE_URL = 'http://api.test';

export interface TestApi {
  client: ApiClient;
  tokens: TokenStore;
}

export function createTestApi(timeoutMs = 3000): TestApi {
  const tokens = createTokenStore();
  return { tokens, client: createApiClient({ baseUrl: TEST_BASE_URL, tokens, timeoutMs }) };
}

export function renderWithApi(
  ui: (api: TestApi) => ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const api = createTestApi();
  return { api, ...render(ui(api), options) };
}
