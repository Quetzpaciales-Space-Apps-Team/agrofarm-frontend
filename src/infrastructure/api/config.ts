import type { Fetcher } from './middleware';

export interface RuntimeConfig {
  apiBaseUrl: string;
  useMocks: boolean;
}

export const DEFAULT_CONFIG: RuntimeConfig = {
  apiBaseUrl: 'http://localhost:8000',
  useMocks: false,
};

const defaultFetcher: Fetcher = (input, init) => globalThis.fetch(input, init);

/**
 * Reads `/config.json`, which the container entrypoint writes from API_BASE_URL and USE_MOCKS
 * (docker/40-generate-config.sh). Any problem falls back to the defaults.
 */
export async function loadRuntimeConfig(fetcher: Fetcher = defaultFetcher): Promise<RuntimeConfig> {
  try {
    const response = await fetcher('/config.json', { cache: 'no-store' });
    if (!response.ok) return DEFAULT_CONFIG;
    const data: unknown = await response.json();
    if (
      typeof data === 'object' &&
      data !== null &&
      typeof (data as RuntimeConfig).apiBaseUrl === 'string' &&
      typeof (data as RuntimeConfig).useMocks === 'boolean'
    ) {
      const { apiBaseUrl, useMocks } = data as RuntimeConfig;
      return { apiBaseUrl, useMocks };
    }
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}
