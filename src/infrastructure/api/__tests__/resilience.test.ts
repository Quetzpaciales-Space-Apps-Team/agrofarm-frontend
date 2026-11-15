import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../errorNormalizer';
import { locale } from '../locale';
import { logger } from '../logger';
import type { Fetcher } from '../middleware';
import { refreshOn401 } from '../refreshOn401';
import { retry } from '../retry';

const ok = () => new Response('{}', { status: 200 });
const apiError = (status: number, code = 'x') => new ApiError({ code, message: 'm', status });
const networkError = () => apiError(0, 'network_error');

describe('locale middleware (FE-101)', () => {
  it('sets Accept-Language from the current locale', async () => {
    const base: Fetcher = vi.fn(async () => ok());
    await locale(() => 'en')(base)('/x');
    expect(new Headers(vi.mocked(base).mock.calls[0][1]?.headers).get('Accept-Language')).toBe(
      'en',
    );
  });

  it('keeps an Accept-Language the caller already set', async () => {
    const base: Fetcher = vi.fn(async () => ok());
    await locale(() => 'en')(base)('/x', { headers: { 'Accept-Language': 'es' } });
    expect(new Headers(vi.mocked(base).mock.calls[0][1]?.headers).get('Accept-Language')).toBe(
      'es',
    );
  });
});

describe('retry middleware (FE-101)', () => {
  const instant = { sleep: vi.fn(async () => undefined) };

  it('retries an idempotent GET after a network failure and then succeeds', async () => {
    const base: Fetcher = vi
      .fn<Fetcher>()
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValue(ok());
    const response = await retry({ ...instant })(base)('/x', { method: 'GET' });
    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(3);
  });

  it('treats a missing method as GET', async () => {
    const base: Fetcher = vi
      .fn<Fetcher>()
      .mockRejectedValueOnce(networkError())
      .mockResolvedValue(ok());
    await retry({ ...instant })(base)('/x');
    expect(base).toHaveBeenCalledTimes(2);
  });

  it.each(['POST', 'PUT', 'DELETE', 'PATCH'])('never retries %s', async (method) => {
    const base: Fetcher = vi.fn<Fetcher>().mockRejectedValue(networkError());
    await expect(retry({ ...instant })(base)('/x', { method })).rejects.toBeInstanceOf(ApiError);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 404, 422, 500])('does not retry a %i answer', async (status) => {
    const base: Fetcher = vi.fn<Fetcher>().mockRejectedValue(apiError(status));
    await expect(retry({ ...instant })(base)('/x')).rejects.toMatchObject({ status });
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('gives up after the retry limit and throws the last error', async () => {
    const base: Fetcher = vi.fn<Fetcher>().mockRejectedValue(networkError());
    await expect(retry({ retries: 2, ...instant })(base)('/x')).rejects.toMatchObject({
      code: 'network_error',
    });
    expect(base).toHaveBeenCalledTimes(3);
  });

  it('backs off with growing delays', async () => {
    const sleep = vi.fn(async () => undefined);
    const base: Fetcher = vi.fn<Fetcher>().mockRejectedValue(networkError());
    await retry({ retries: 3, baseDelayMs: 100, sleep })(base)('/x').catch(() => undefined);
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([100, 200, 400]);
  });

  it('does not retry after the caller aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const base: Fetcher = vi.fn<Fetcher>().mockRejectedValue(networkError());
    await retry({ ...instant })(base)('/x', { signal: controller.signal }).catch(() => undefined);
    expect(base).toHaveBeenCalledTimes(1);
  });
});

describe('refreshOn401 middleware (FE-101)', () => {
  const bearer = (init?: RequestInit) => new Headers(init?.headers).get('Authorization');

  function setup(options: { refreshed?: string | null } = {}) {
    let token: string | null = 'old';
    const refresh = vi.fn(async () => {
      await Promise.resolve();
      if (options.refreshed === null) return null;
      token = options.refreshed ?? 'new';
      return token;
    });
    const base: Fetcher = vi.fn<Fetcher>(async (_input, init) => {
      if (bearer(init) === 'Bearer new') return ok();
      throw apiError(401, 'unauthorized');
    });
    const fetcher = refreshOn401({ getToken: () => token, refresh })(base);
    return { fetcher, refresh, base, setToken: (value: string | null) => (token = value) };
  }

  it('refreshes once and replays the request once with the new token', async () => {
    const { fetcher, refresh, base } = setup();
    const response = await fetcher('/v1/farms', { headers: { Authorization: 'Bearer old' } });
    expect(response.status).toBe(200);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(base).toHaveBeenCalledTimes(2);
    expect(bearer(vi.mocked(base).mock.calls[1][1])).toBe('Bearer new');
  });

  it('runs one single-flight refresh for concurrent 401 answers and replays each request once', async () => {
    const { fetcher, refresh, base } = setup();
    const calls = ['/a', '/b', '/c'].map((path) =>
      fetcher(path, { headers: { Authorization: 'Bearer old' } }),
    );
    const responses = await Promise.all(calls);
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(base).toHaveBeenCalledTimes(6);
  });

  it('does not refresh again when the replay also fails with 401', async () => {
    let token: string | null = 'old';
    const refresh = vi.fn(async () => (token = 'new'));
    const base: Fetcher = vi.fn<Fetcher>().mockRejectedValue(apiError(401, 'unauthorized'));
    const fetcher = refreshOn401({ getToken: () => token, refresh })(base);
    await expect(fetcher('/x', { headers: { Authorization: 'Bearer old' } })).rejects.toMatchObject(
      {
        status: 401,
      },
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('throws the original 401 when the session cannot be refreshed', async () => {
    const { fetcher, base } = setup({ refreshed: null });
    await expect(fetcher('/x', { headers: { Authorization: 'Bearer old' } })).rejects.toMatchObject(
      {
        status: 401,
      },
    );
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('throws the original 401 when the refresh call itself fails', async () => {
    const base: Fetcher = vi.fn<Fetcher>().mockRejectedValue(apiError(401, 'unauthorized'));
    const refresh = vi.fn().mockRejectedValue(networkError());
    const fetcher = refreshOn401({ getToken: () => 'old', refresh })(base);
    await expect(fetcher('/x')).rejects.toMatchObject({ status: 401 });
  });

  it('replays without a new refresh when another request already renewed the token', async () => {
    const { fetcher, refresh, setToken } = setup();
    setToken('new');
    const response = await fetcher('/x', { headers: { Authorization: 'Bearer old' } });
    expect(response.status).toBe(200);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('starts a new refresh for a later expiry', async () => {
    const { fetcher, refresh, setToken } = setup();
    await fetcher('/x', { headers: { Authorization: 'Bearer old' } });
    setToken('old');
    await fetcher('/y', { headers: { Authorization: 'Bearer old' } });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it.each(['/v1/auth/login', '/v1/auth/register', '/v1/auth/refresh', '/v1/auth/logout'])(
    'never refreshes for %s',
    async (path) => {
      const { fetcher, refresh } = setup();
      await expect(fetcher(`http://api.test${path}`)).rejects.toMatchObject({ status: 401 });
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it('passes other errors and successes through untouched', async () => {
    const refresh = vi.fn();
    const failing: Fetcher = vi.fn<Fetcher>().mockRejectedValue(apiError(500));
    await expect(
      refreshOn401({ getToken: () => 'a', refresh })(failing)('/x'),
    ).rejects.toMatchObject({ status: 500 });
    const fine: Fetcher = vi.fn<Fetcher>(async () => ok());
    expect((await refreshOn401({ getToken: () => 'a', refresh })(fine)('/x')).status).toBe(200);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('logger middleware (FE-101)', () => {
  it('logs method, path, status and duration, nothing else', async () => {
    const sink = vi.fn();
    const base: Fetcher = vi.fn(async () => ok());
    await logger({ enabled: true, sink })(base)('http://api.test/v1/farms?email=ana@example.test', {
      method: 'GET',
      headers: { Authorization: 'Bearer secret-token', 'X-Request-Id': 'rid-1' },
    });
    expect(sink).toHaveBeenCalledTimes(1);
    const line = JSON.stringify(sink.mock.calls[0]);
    expect(line).toContain('GET');
    expect(line).toContain('/v1/farms');
    expect(line).toContain('200');
    expect(line).toContain('rid-1');
    expect(line).not.toContain('secret-token');
    expect(line).not.toContain('ana@example.test');
  });

  it('never prints a request body (passwords) or the refreshed token', async () => {
    const sink = vi.fn();
    const base: Fetcher = vi.fn(
      async () => new Response(JSON.stringify({ access_token: 'secret-access-token' })),
    );
    await logger({ enabled: true, sink })(base)('http://api.test/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ana@example.test', password: 'secret-password-1' }),
    });
    const line = JSON.stringify(sink.mock.calls);
    expect(line).not.toContain('secret-password-1');
    expect(line).not.toContain('ana@example.test');
    expect(line).not.toContain('secret-access-token');
  });

  it('logs a failure with the error code and rethrows it', async () => {
    const sink = vi.fn();
    const base: Fetcher = vi.fn<Fetcher>().mockRejectedValue(apiError(503, 'unavailable'));
    await expect(
      logger({ enabled: true, sink })(base)('http://api.test/v1/x'),
    ).rejects.toBeInstanceOf(ApiError);
    expect(JSON.stringify(sink.mock.calls)).toContain('unavailable');
  });

  it('prints nothing when disabled', async () => {
    const sink = vi.fn();
    const base: Fetcher = vi.fn(async () => ok());
    await logger({ enabled: false, sink })(base)('/x');
    expect(sink).not.toHaveBeenCalled();
  });
});
