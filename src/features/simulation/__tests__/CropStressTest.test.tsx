import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ApiProvider } from '../../../services/ApiContext';
import { expectNoAxeViolations } from '../../../test/axe';
import { DEMO_FARM_ID, problemResponse, simulateStub } from '../../../test/handlers';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { CropStressTest } from '../components/CropStressTest';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderStressTest() {
  return renderWithApi((api) => {
    api.tokens.set('stub.access.token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <CropStressTest farmId={DEMO_FARM_ID} />
      </ApiProvider>
    );
  });
}

describe('CropStressTest', () => {
  it('does not run on mount, runs with max concurrency 2 on click, caches results, and shows caveats', async () => {
    let calls = 0;
    let active = 0;
    let maxActive = 0;

    server.use(
      http.post('*/v1/scenarios/simulate', async ({ request }) => {
        calls += 1;
        active += 1;
        maxActive = Math.max(maxActive, active);
        const body = (await request.json()) as {
          crop: string;
          scenario: {
            rainfall_change_pct: number;
            temperature_change_c: number;
            enso_phase: 'el_nino' | 'la_nina' | 'neutral';
          };
        };
        await new Promise((r) => setTimeout(r, 10));
        active -= 1;
        const base = simulateStub(body.scenario);
        const cropOffset = body.crop === 'black_beans' ? 2 : body.crop === 'cover_crop' ? 4 : 0;
        return HttpResponse.json({
          ...base,
          crop: body.crop,
          scenario: {
            p10: base.scenario.p10 + cropOffset,
            p50: base.scenario.p50 + cropOffset,
            p90: base.scenario.p90 + cropOffset,
          },
        });
      }),
    );

    const { container } = renderStressTest();
    expect(calls).toBe(0);

    await userEvent.click(screen.getByRole('button', { name: /run stress test/i }));
    await waitFor(() => expect(calls).toBe(12));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument(),
    );
    const table = screen.getByRole('table', { name: /crop stress test/i });

    expect(calls).toBe(12);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(within(table).getAllByRole('row')).toHaveLength(4); // header + 3 crops
    expect(screen.getAllByText(/worst for crop/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/most resilient/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/agrofarm-stub \(stub-0\.1\.0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/not a full rotation evaluation/i)).toBeInTheDocument();

    // Re-running uses in-memory cache (no new API calls)
    await userEvent.click(screen.getByRole('button', { name: /run stress test/i }));
    expect(calls).toBe(12);

    await expectNoAxeViolations(container);
  });

  it('allows cancelling an in-progress stress test', async () => {
    let calls = 0;
    server.use(
      http.post('*/v1/scenarios/simulate', async ({ request }) => {
        calls += 1;
        const body = (await request.json()) as { crop: string; scenario: object };
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json({ ...simulateStub(body.scenario), crop: body.crop });
      }),
    );

    renderStressTest();
    await userEvent.click(screen.getByRole('button', { name: /run stress test/i }));
    const cancelBtn = await screen.findByRole('button', { name: /cancel/i });
    await userEvent.click(cancelBtn);

    await waitFor(() => expect(screen.getByText(/cancelled/i)).toBeInTheDocument());
    expect(calls).toBeLessThan(12);
  });

  it('shows an error alert on 429/503/401', async () => {
    server.use(
      http.post('*/v1/scenarios/simulate', () => problemResponse(429, 'rate_limited', 'Busy.')),
    );
    renderStressTest();
    await userEvent.click(screen.getByRole('button', { name: /run stress test/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many requests/i);
  });
});
