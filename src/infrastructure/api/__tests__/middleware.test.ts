import { describe, expect, it, vi } from 'vitest';
import { ApiError, errorNormalizer, isApiError } from '../errorNormalizer';
import { authMiddleware, createTokenStore } from '../auth';
import { compose, type Fetcher } from '../middleware';
import { requestId } from '../requestId';
import { timeout } from '../timeout';

const okFetch = (): Fetcher => vi.fn(async () => new Response('{}', { status: 200 }));
const headersOf = (fetcher: Fetcher) =>
  new Headers((vi.mocked(fetcher).mock.calls[0][1] as RequestInit).headers);

describe('compose', () => {
  it('runs the first middleware outermost', async () => {
    const order: string[] = [];
    const tag =
      (name: string) =>
      (next: Fetcher): Fetcher =>
      async (input, init) => {
        order.push(`${name}:in`);
        const res = await next(input, init);
        order.push(`${name}:out`);
        return res;
      };
    await compose(tag('a'), tag('b'))(okFetch())('/x');
    expect(order).toEqual(['a:in', 'b:in', 'b:out', 'a:out']);
  });
});

describe('requestId middleware', () => {
  it('adds a unique X-Request-Id to every call', async () => {
    const base = okFetch();
    const fetcher = compose(requestId())(base);
    await fetcher('/a');
    await fetcher('/b');
    const calls = vi.mocked(base).mock.calls;
    const first = new Headers((calls[0][1] as RequestInit).headers).get('X-Request-Id');
    const second = new Headers((calls[1][1] as RequestInit).headers).get('X-Request-Id');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it('keeps an id the caller already set', async () => {
    const base = okFetch();
    await compose(requestId())(base)('/a', { headers: { 'X-Request-Id': 'mine' } });
    expect(headersOf(base).get('X-Request-Id')).toBe('mine');
  });
});

describe('auth middleware', () => {
  it('attaches the in-memory token as a bearer header', async () => {
    const store = createTokenStore();
    store.set('tok-1');
    const base = okFetch();
    await compose(authMiddleware(store.get))(base)('/a');
    expect(headersOf(base).get('Authorization')).toBe('Bearer tok-1');
  });

  it('sends no Authorization header when there is no token, or after clear()', async () => {
    const store = createTokenStore();
    const base = okFetch();
    await compose(authMiddleware(store.get))(base)('/a');
    expect(headersOf(base).has('Authorization')).toBe(false);
    store.set('x');
    store.clear();
    expect(store.get()).toBeNull();
  });

  it('never writes the token to web storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    createTokenStore().set('secret');
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length + sessionStorage.length).toBe(0);
    setItem.mockRestore();
  });
});

describe('timeout middleware', () => {
  const hanging = (): Fetcher =>
    vi.fn(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );

  it('aborts a slow call with a TimeoutError reason', async () => {
    const fetcher = compose(timeout(20))(hanging());
    await expect(fetcher('/slow')).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('lets fast calls through and cleans up', async () => {
    const res = await compose(timeout(1000))(okFetch())('/fast');
    expect(res.status).toBe(200);
  });

  it('still honours an abort from the caller', async () => {
    const controller = new AbortController();
    const promise = compose(timeout(1000))(hanging())('/x', { signal: controller.signal });
    controller.abort(new DOMException('stop', 'AbortError'));
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('errorNormalizer middleware', () => {
  const respond = (status: number, body: unknown, contentType = 'application/problem+json') =>
    vi.fn(
      async () =>
        new Response(typeof body === 'string' ? body : JSON.stringify(body), {
          status,
          headers: { 'Content-Type': contentType, 'X-Request-Id': 'req-from-header' },
        }),
    ) as Fetcher;

  it('passes successful responses through untouched', async () => {
    const res = await compose(errorNormalizer())(okFetch())('/a');
    expect(res.status).toBe(200);
  });

  it('parses problem+json into an ApiError', async () => {
    const problem = {
      type: 't',
      title: 'Validation failed',
      status: 422,
      code: 'validation_error',
      detail: 'start must not be after end.',
      request_id: 'req-9',
      errors: [{ field: 'start', message: 'bad' }],
    };
    const error = await compose(errorNormalizer())(respond(422, problem))('/a').catch((e) => e);
    expect(isApiError(error)).toBe(true);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'validation_error',
      message: 'start must not be after end.',
      status: 422,
      requestId: 'req-9',
      details: [{ field: 'start', message: 'bad' }],
    });
  });

  it('maps a non-problem error body to a stable code from the status', async () => {
    const error = await compose(errorNormalizer())(respond(500, '<html>oops</html>', 'text/html'))(
      '/a',
    ).catch((e) => e);
    expect(error).toMatchObject({ status: 500, code: 'server_error', requestId: 'req-from-header' });
    const unauthorized = await compose(errorNormalizer())(respond(401, '', 'text/plain'))('/a').catch(
      (e) => e,
    );
    expect(unauthorized.code).toBe('unauthorized');
  });

  it('maps a network failure to network_error with status 0', async () => {
    const failing: Fetcher = async () => {
      throw new TypeError('Failed to fetch');
    };
    const error = await compose(errorNormalizer())(failing)('/a').catch((e) => e);
    expect(error).toMatchObject({ code: 'network_error', status: 0 });
  });

  it('maps a timeout abort to timeout and keeps the request id the client sent', async () => {
    const fetcher = compose(
      requestId(),
      timeout(10),
      errorNormalizer(),
    )(
      (_input, init) =>
        new Promise<Response>((_res, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    const error = await fetcher('/slow').catch((e) => e);
    expect(error).toMatchObject({ code: 'timeout', status: 0 });
    expect(error.requestId).toBeTruthy();
  });

  it('rethrows a caller abort as an AbortError without wrapping it', async () => {
    const controller = new AbortController();
    const fetcher = compose(errorNormalizer())(
      (_input, init) =>
        new Promise<Response>((_res, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    const promise = fetcher('/x', { signal: controller.signal });
    controller.abort(new DOMException('stop', 'AbortError'));
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
