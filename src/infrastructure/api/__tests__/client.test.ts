// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTokenStore } from '../auth';
import { createApiClient } from '../client';
import { isApiError } from '../errorNormalizer';
import { handlers, DEMO_ACCESS_TOKEN, DEMO_FARM_ID, problemResponse } from '../../../test/handlers';

const BASE = 'http://api.test';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeClient(timeoutMs = 2000) {
  const tokens = createTokenStore();
  return { tokens, client: createApiClient({ baseUrl: BASE, tokens, timeoutMs }) };
}

describe('api client against MSW handlers', () => {
  it('returns parsed JSON and sends credentials include, a request id and the bearer token', async () => {
    const seen: { auth: string | null; id: string | null; credentials: string }[] = [];
    server.use(
      http.get(`${BASE}/v1/me`, ({ request }) => {
        seen.push({
          auth: request.headers.get('Authorization'),
          id: request.headers.get('X-Request-Id'),
          credentials: request.credentials,
        });
        return HttpResponse.json({ ok: true });
      }),
    );
    const { client, tokens } = makeClient();
    tokens.set('abc');
    await client.get('/v1/me');
    expect(seen[0].auth).toBe('Bearer abc');
    expect(seen[0].id).toBeTruthy();
    expect(seen[0].credentials).toBe('include');
  });

  it('calls POST /v1/auth/demo and the farm endpoint with the issued token', async () => {
    const { client, tokens } = makeClient();
    const session = await client.post<{ access_token: string; farm_id: string }>('/v1/auth/demo');
    expect(session.access_token).toBe(DEMO_ACCESS_TOKEN);
    tokens.set(session.access_token);
    const farm = await client.get<{ id: string }>(`/v1/farms/${session.farm_id}`);
    expect(farm.id).toBe(DEMO_FARM_ID);
  });

  it('serialises query parameters and skips undefined ones', async () => {
    const { client, tokens } = makeClient();
    tokens.set('t');
    const series = await client.get<{ items: { month: string }[] }>('/v1/climate/nasa-power', {
      query: { start: '2024-03', end: '2024-04', unused: undefined },
    });
    expect(series.items.map((i) => i.month)).toEqual(['2024-03', '2024-04']);
  });

  it('sends JSON bodies', async () => {
    const { client, tokens } = makeClient();
    tokens.set('t');
    const result = await client.post<{ scenario: { p50: number } }>('/v1/scenarios/simulate', {
      body: { farm_id: DEMO_FARM_ID, crop: 'maize', scenario: { rainfall_change_pct: 20 } },
    });
    expect(result.scenario.p50).toBe(9);
  });

  it('turns a 401 into an ApiError with code unauthorized and the problem request id', async () => {
    const { client } = makeClient();
    const error = await client.get('/v1/me').catch((e) => e);
    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ status: 401, code: 'unauthorized' });
    expect(error.requestId).toMatch(/^req-msw/);
  });

  it('turns a 500 into an ApiError', async () => {
    server.use(
      http.get(`${BASE}/v1/farms`, () =>
        problemResponse(500, 'internal_error', 'Something went wrong.'),
      ),
    );
    const { client } = makeClient();
    const error = await client.get('/v1/farms').catch((e) => e);
    expect(error).toMatchObject({ status: 500, code: 'internal_error' });
  });

  it('returns undefined for 204 responses', async () => {
    server.use(http.post(`${BASE}/v1/auth/logout`, () => new HttpResponse(null, { status: 204 })));
    const { client } = makeClient();
    await expect(client.post('/v1/auth/logout')).resolves.toBeUndefined();
  });

  it('times out slow calls with code timeout', async () => {
    server.use(
      http.get(`${BASE}/v1/farms`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return HttpResponse.json({});
      }),
    );
    const { client } = makeClient(30);
    const error = await client.get('/v1/farms').catch((e) => e);
    expect(error).toMatchObject({ code: 'timeout' });
  });

  it('maps a network failure to network_error', async () => {
    server.use(http.get(`${BASE}/v1/farms`, () => HttpResponse.error()));
    const { client } = makeClient();
    const error = await client.get('/v1/farms').catch((e) => e);
    expect(error).toMatchObject({ code: 'network_error' });
  });

  it('joins base URL and path without double slashes', async () => {
    const tokens = createTokenStore();
    const client = createApiClient({ baseUrl: `${BASE}/`, tokens });
    await expect(client.post('/v1/auth/demo')).resolves.toBeDefined();
  });
});
