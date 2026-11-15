import { createContext, useContext, type ReactNode } from 'react';
import type { TokenStore } from '../infrastructure/api/auth';
import type { ApiClient } from '../infrastructure/api/client';

interface ApiContextValue {
  client: ApiClient;
  tokens: TokenStore;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({
  client,
  tokens,
  children,
}: ApiContextValue & { children: ReactNode }) {
  return <ApiContext.Provider value={{ client, tokens }}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiContextValue {
  const value = useContext(ApiContext);
  if (!value) throw new Error('useApi must be used inside <ApiProvider>.');
  return value;
}
