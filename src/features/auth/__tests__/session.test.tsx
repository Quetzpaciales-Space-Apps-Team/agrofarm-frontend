import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiProvider } from '../../../services/ApiContext';
import { DEMO_FARM_ID, problemResponse } from '../../../test/handlers';
import { createTestApi } from '../../../test/render';
import { server } from '../../../test/server';
import { SessionProvider, useSession } from '../state/session';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let setItem: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  setItem = vi.spyOn(Storage.prototype, 'setItem');
});
afterEach(() => setItem.mockRestore());

function setup() {
  const api = createTestApi();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApiProvider client={api.client} tokens={api.tokens}>
      <SessionProvider>{children}</SessionProvider>
    </ApiProvider>
  );
  return { api, ...renderHook(() => useSession(), { wrapper }) };
}

describe('guest demo session (FE-090)', () => {
  it('starts anonymous', () => {
    const { result } = setup();
    expect(result.current.status).toBe('anonymous');
    expect(result.current.farmId).toBeNull();
  });

  it('calls POST /v1/auth/demo and keeps token, farm id and the guest flag in memory', async () => {
    const { result, api } = setup();
    act(() => {
      void result.current.startDemo();
    });
    expect(result.current.status).toBe('starting');
    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(result.current.farmId).toBe(DEMO_FARM_ID);
    expect(result.current.isDemoGuest).toBe(true);
    expect(api.tokens.get()).toBeTruthy();
  });

  it('never writes anything to localStorage or sessionStorage', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.startDemo();
    });
    expect(result.current.status).toBe('active');
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it.each([
    [404, 'auth.demo.disabled'],
    [429, 'auth.demo.rateLimited'],
    [503, 'auth.demo.full'],
    [500, 'auth.demo.failed'],
  ])('maps a %i answer to the message key %s and stays anonymous', async (status, key) => {
    server.use(http.post('*/v1/auth/demo', () => problemResponse(status, 'x', 'Nope.')));
    const { result, api } = setup();
    await act(async () => {
      await result.current.startDemo();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.errorKey).toBe(key);
    expect(api.tokens.get()).toBeNull();
    expect(result.current.farmId).toBeNull();
  });

  it('maps a network failure to a network message', async () => {
    server.use(http.post('*/v1/auth/demo', () => HttpResponse.error()));
    const { result } = setup();
    await act(async () => {
      await result.current.startDemo();
    });
    expect(result.current.errorKey).toBe('errors.network');
  });

  it('can try again after an error', async () => {
    server.use(
      http.post('*/v1/auth/demo', () => problemResponse(503, 'unavailable', 'Full.'), {
        once: true,
      }),
    );
    const { result } = setup();
    await act(async () => {
      await result.current.startDemo();
    });
    expect(result.current.status).toBe('error');
    await act(async () => {
      await result.current.startDemo();
    });
    expect(result.current.status).toBe('active');
    expect(result.current.errorKey).toBeNull();
  });

  it('leave() clears the token and returns to anonymous', async () => {
    const { result, api } = setup();
    await act(async () => {
      await result.current.startDemo();
    });
    act(() => result.current.leave());
    expect(result.current.status).toBe('anonymous');
    expect(api.tokens.get()).toBeNull();
  });
});
