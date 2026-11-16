import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/errors';
import { ApiProvider } from '../../services/ApiContext';
import { DEMO_FARM_ID } from '../../test/handlers';
import { renderWithApi } from '../../test/render';
import { server } from '../../test/server';
import { PanelErrorState, PanelLoadingState } from '../PanelState';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PanelState (T5 resilience)', () => {
  it('shows a cold-start message if loading takes longer than 3 seconds', () => {
    vi.useFakeTimers();
    try {
      render(<PanelLoadingState label="Loading scenarios..." />);
      expect(screen.getByRole('status')).toHaveTextContent(/loading scenarios/i);
      expect(screen.queryByText(/waking up the server/i)).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3100);
      });
      expect(screen.getByText(/waking up the server/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers Start a new demo on 401 and refreshes the token before retrying', async () => {
    let tokenSeen: string | null = null;
    const onRetry = vi.fn();
    server.use(
      http.post('*/v1/auth/demo', () =>
        HttpResponse.json(
          {
            access_token: 'fresh.demo.token',
            token_type: 'bearer',
            expires_in: 900,
            farm_id: DEMO_FARM_ID,
            is_demo_guest: true,
          },
          { status: 201 },
        ),
      ),
    );

    renderWithApi((api) => (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <PanelErrorState
          error={new ApiError({ code: 'http_error', message: 'Expired', status: 401 })}
          onRetry={() => {
            tokenSeen = api.tokens.get();
            onRetry();
          }}
        />
      </ApiProvider>
    ));

    expect(screen.getByRole('alert')).toHaveTextContent(/session expired/i);
    await userEvent.click(screen.getByRole('button', { name: /start a new demo/i }));
    await waitFor(() => expect(onRetry).toHaveBeenCalledOnce());
    expect(tokenSeen).toBe('fresh.demo.token');
  });

  it.each([
    { status: 422, code: 'validation_error', pattern: /could not process/i },
    { status: 429, code: 'rate_limited', pattern: /the demo is busy, try again in a minute/i },
    { status: 503, code: 'unavailable', pattern: /reached its capacity/i },
  ])('shows an actionable message for HTTP $status', ({ status, code, pattern }) => {
    renderWithApi((api) => (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <PanelErrorState error={new ApiError({ code, message: 'Err', status })} onRetry={vi.fn()} />
      </ApiProvider>
    ));
    expect(screen.getByRole('alert')).toHaveTextContent(pattern);
  });
});
