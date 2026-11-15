import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, loadRuntimeConfig } from '../config';

const json = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('loadRuntimeConfig', () => {
  it('reads apiBaseUrl and useMocks from /config.json', async () => {
    const fetcher = json({ apiBaseUrl: 'https://api.example.test', useMocks: true });
    await expect(loadRuntimeConfig(fetcher)).resolves.toEqual({
      apiBaseUrl: 'https://api.example.test',
      useMocks: true,
    });
    expect(fetcher).toHaveBeenCalledWith('/config.json', { cache: 'no-store' });
  });

  it('falls back to defaults when the file is missing, not JSON, or has the wrong shape', async () => {
    await expect(loadRuntimeConfig(json({}, 404))).resolves.toEqual(DEFAULT_CONFIG);
    await expect(
      loadRuntimeConfig(vi.fn(async () => new Response('<html></html>'))),
    ).resolves.toEqual(DEFAULT_CONFIG);
    await expect(loadRuntimeConfig(json({ apiBaseUrl: 5, useMocks: 'yes' }))).resolves.toEqual(
      DEFAULT_CONFIG,
    );
    await expect(
      loadRuntimeConfig(
        vi.fn(async () => {
          throw new TypeError('offline');
        }),
      ),
    ).resolves.toEqual(DEFAULT_CONFIG);
  });

  it('defaults to the real API, no mocks', () => {
    expect(DEFAULT_CONFIG.useMocks).toBe(false);
  });
});
