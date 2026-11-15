// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  handlers,
  LOGIN_ACCESS_TOKEN,
  problemResponse,
  REFRESHED_ACCESS_TOKEN,
  setRefreshCookie,
} from '../../../test/handlers';
import { createTokenStore } from '../auth';
import { createApiClient } from '../client';

const BASE = 'http://api.test';
const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  setRefreshCookie(false);
});
afterAll(() => server.close());

function makeClient(options: { logSink?: (...args: unknown[]) => void } = {}) {
  const tokens = createTokenStore();
  const client = createApiClient({
    baseUrl: BASE,
    tokens,
    timeoutMs: 2000,
    retryDelayMs: 1,
    getLocale: () => 'en',
    log: options.logSink ? { enabled: true, sink: options.logSink } : undefined,
  });
  return { tokens, client };
}

describe('api client session refresh (FE-101, FE-104)', () => {
  it('sends Accept-Language on every call', async () => {
    let seen: string | null = null;
    server.use(
      http.get(`${BASE}/v1/me`, ({ request }) => {
        seen = request.headers.get('Accept-Language');
        return HttpResponse.json({});
      }),
    );
    await makeClient().client.get('/v1/me');
    expect(seen).toBe('en');
  });

  it('refreshes an expired access token and replays the request with the new token', async () => {
    setRefreshCookie(true);
    server.use(
      http.get(`${BASE}/v1/farms`, ({ request }) =>
        request.headers.get('Authorization') === `Bearer ${REFRESHED_ACCESS_TOKEN}`
          ? HttpResponse.json({ items: [], next_cursor: null })
          : problemResponse(401, 'unauthorized', 'Expired.'),
      ),
    );
    const { client, tokens } = makeClient();
    tokens.set('expired');
    await expect(client.get('/v1/farms')).resolves.toEqual({ items: [], next_cursor: null });
    expect(tokens.get()).toBe(REFRESHED_ACCESS_TOKEN);
  });

  it('shares one refresh call between concurrent 401 answers', async () => {
    setRefreshCookie(true);
    let refreshCalls = 0;
    server.use(
      http.post(`${BASE}/v1/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({
          access_token: REFRESHED_ACCESS_TOKEN,
          token_type: 'bearer',
          expires_in: 900,
        });
      }),
      http.get(`${BASE}/v1/farms`, ({ request }) =>
        request.headers.get('Authorization') === `Bearer ${REFRESHED_ACCESS_TOKEN}`
          ? HttpResponse.json({ ok: true })
          : problemResponse(401, 'unauthorized', 'Expired.'),
      ),
    );
    const { client, tokens } = makeClient();
    tokens.set('expired');
    await Promise.all([client.get('/v1/farms'), client.get('/v1/farms'), client.get('/v1/farms')]);
    expect(refreshCalls).toBe(1);
  });

  it('clears the token, tells listeners and rethrows the 401 when the cookie is gone', async () => {
    server.use(http.get(`${BASE}/v1/farms`, () => problemResponse(401, 'unauthorized', 'No.')));
    const { client, tokens } = makeClient();
    const expired = vi.fn();
    client.onSessionExpired(expired);
    tokens.set('expired');
    await expect(client.get('/v1/farms')).rejects.toMatchObject({ status: 401 });
    expect(tokens.get()).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('refresh() returns null without a valid cookie and a token with one, and leaves the store alone', async () => {
    const { client, tokens } = makeClient();
    tokens.set('current');
    await expect(client.refresh()).resolves.toBeNull();
    setRefreshCookie(true);
    await expect(client.refresh()).resolves.toBe(REFRESHED_ACCESS_TOKEN);
    expect(tokens.get()).toBe('current');
  });

  it('a wrong login is a 401 that does not trigger a refresh', async () => {
    let refreshCalls = 0;
    server.use(
      http.post(`${BASE}/v1/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({});
      }),
    );
    const { client } = makeClient();
    await expect(
      client.post('/v1/auth/login', { body: { email: 'a@example.test', password: 'wrong' } }),
    ).rejects.toMatchObject({ status: 401 });
    expect(refreshCalls).toBe(0);
  });

  it('retries an idempotent GET after a network failure but never a POST', async () => {
    let gets = 0;
    let posts = 0;
    server.use(
      http.get(`${BASE}/v1/me`, () => {
        gets += 1;
        return gets < 3 ? HttpResponse.error() : HttpResponse.json({ ok: true });
      }),
      http.post(`${BASE}/v1/auth/login`, () => {
        posts += 1;
        return HttpResponse.error();
      }),
    );
    const { client } = makeClient();
    await expect(client.get('/v1/me')).resolves.toEqual({ ok: true });
    expect(gets).toBe(3);
    await expect(client.post('/v1/auth/login', { body: {} })).rejects.toMatchObject({
      code: 'network_error',
    });
    expect(posts).toBe(1);
  });

  it('logs calls without tokens, passwords or personal data', async () => {
    const sink = vi.fn();
    const { client } = makeClient({ logSink: sink });
    await client
      .post('/v1/auth/login', {
        body: { email: 'farmer@example.test', password: 'fake-test-pass-01' },
      })
      .catch(() => undefined);
    const login = await client.post('/v1/auth/login', {
      body: { email: 'farmer@example.test', password: 'fake-test-pass-01' },
    });
    expect(login).toMatchObject({ access_token: LOGIN_ACCESS_TOKEN });
    const printed = JSON.stringify(sink.mock.calls);
    expect(sink).toHaveBeenCalled();
    expect(printed).not.toContain('fake-test-pass-01');
    expect(printed).not.toContain('farmer@example.test');
    expect(printed).not.toContain(LOGIN_ACCESS_TOKEN);
  });
});
