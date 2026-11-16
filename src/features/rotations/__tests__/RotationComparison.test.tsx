import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ApiProvider } from '../../../services/ApiContext';
import {
  DEMO_FARM_ID,
  DISCLAIMER_TEXT,
  problemResponse,
  recommendStub,
} from '../../../test/handlers';
import { expectNoAxeViolations } from '../../../test/axe';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { RotationComparison } from '../components/RotationComparison';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const SCENARIO = {
  rainfall_change_pct: -20,
  temperature_change_c: 1,
  enso_phase: 'el_nino',
} as const;

function renderComparison() {
  return renderWithApi((api) => {
    api.tokens.set('stub.access.token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <RotationComparison farmId={DEMO_FARM_ID} scenario={SCENARIO} />
      </ApiProvider>
    );
  });
}

const cards = () => screen.getAllByRole('article');

async function ready() {
  const utils = renderComparison();
  await screen.findAllByRole('article');
  return utils;
}

function setWith(strategies: unknown[]) {
  server.use(
    http.post('*/v1/farms/:id/recommendations', () =>
      HttpResponse.json(
        {
          id: '9d2b7c44-0f6e-4b0b-8a3f-7c1e5d9a6b21',
          farm_id: DEMO_FARM_ID,
          disclaimer: DISCLAIMER_TEXT,
          strategies,
          provenance: {
            model_name: 'agrofarm-stub',
            model_version: 'stub-0.1.0',
            data_versions: {},
            input_hash: '0',
            generated_at: '2026-11-14T15:20:00Z',
          },
        },
        { status: 201 },
      ),
    ),
  );
}

describe('RotationComparison (FE-403)', () => {
  it('shows a loading state, then at least three strategies', async () => {
    renderComparison();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    await screen.findAllByRole('article');
    expect(cards().length).toBeGreaterThanOrEqual(3);
  });

  it('sends the current scenario with the request', async () => {
    let body: unknown;
    server.use(
      http.post('*/v1/farms/:id/recommendations', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            id: '9d2b7c44-0f6e-4b0b-8a3f-7c1e5d9a6b21',
            farm_id: DEMO_FARM_ID,
            disclaimer: DISCLAIMER_TEXT,
            strategies: recommendStub(SCENARIO),
            provenance: {
              model_name: 'agrofarm-stub',
              model_version: 'stub-0.1.0',
              data_versions: {},
              input_hash: '0',
              generated_at: '2026-11-14T15:20:00Z',
            },
          },
          { status: 201 },
        );
      }),
    );
    await ready();
    expect(body).toEqual({ scenario: SCENARIO });
  });

  it('orders by score and labels the first one as the highest score for the priorities, never "the best"', async () => {
    await ready();
    const scores = cards().map((card) => {
      const match = /Overall score: (\d+) out of 100/.exec(card.textContent ?? '');
      return Number(match?.[1]);
    });
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(
      within(cards()[0]).getByText(/highest score for the priorities you set/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/highest score for the priorities you set/i)).toHaveLength(1);
    expect(screen.queryByText(/\bbest\b/i)).not.toBeInTheDocument();
  });

  it('marks the current rotation in text, exactly once', async () => {
    await ready();
    expect(screen.getAllByText(/your current rotation/i)).toHaveLength(1);
    const current = cards().find((c) => /your current rotation/i.test(c.textContent ?? ''));
    expect(current).toHaveTextContent('Maize, then Fallow');
  });

  it('shows the overall score with its uncertainty interval on a 0..100 scale', async () => {
    await ready();
    const first = cards()[0];
    expect(first).toHaveTextContent(/Overall score: \d+ out of 100/);
    expect(first).toHaveTextContent(/likely range: \d+ to \d+ out of 100/i);
  });

  it('shows the seven priority scores as labelled values from 0 to 100', async () => {
    await ready();
    const list = within(cards()[0]).getByRole('list', { name: /scores by priority/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    for (const label of [
      'Water use',
      'Income',
      'Soil structure',
      'Forage value',
      'Nitrogen fixing',
      'Erosion reduction',
      'Market suitability',
    ]) {
      expect(within(list).getByText(label)).toBeInTheDocument();
    }
    for (const item of items) expect(item.textContent).toMatch(/\b(\d{1,3}) out of 100/);
  });

  it('marks every strategy as needing local review, and shows the five blocks on its detail screen', async () => {
    await ready();
    const total = cards().length;
    for (let index = 0; index < total; index += 1) {
      const card = cards()[index];
      expect(card).toHaveTextContent(/needs local review/i);
      await userEvent.click(within(card).getByRole('button', { name: /view details/i }));
      const detail = await screen.findByRole('article', {
        name: card.querySelector('h4')?.textContent ?? '',
      });
      for (const heading of [
        /why it was suggested/i,
        /evidence/i,
        /expected benefits/i,
        /information gaps/i,
        /risks to check locally/i,
      ]) {
        expect(within(detail).getByRole('heading', { name: heading })).toBeInTheDocument();
      }
      expect(within(detail).getAllByText(/^Source: /).length).toBeGreaterThan(0);
      await userEvent.click(screen.getByRole('button', { name: /back to the comparison/i }));
      await screen.findAllByRole('article');
    }
  });

  it('does not render a strategy that has no gaps or no risks, and says so', async () => {
    const all = recommendStub(SCENARIO);
    setWith([all[0], all[1], { ...all[2], gaps: [] }, { ...all[2], id: 'x', risks: [] }]);
    renderComparison();
    await screen.findAllByRole('article');
    expect(cards()).toHaveLength(2);
    expect(screen.getByText(/2 strategies were left out/i)).toBeInTheDocument();
    expect(screen.getByText(/fewer than three/i)).toBeInTheDocument();
  });

  it('shows the response disclaimer and provenance', async () => {
    await ready();
    expect(screen.getByText(DISCLAIMER_TEXT, { selector: 'p' })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /where these numbers come from/i }),
    ).toHaveTextContent('agrofarm-stub');
  });

  it('shows an empty state when no strategies come back', async () => {
    setWith([]);
    renderComparison();
    expect(await screen.findByText(/no rotation strategies/i)).toBeInTheDocument();
  });

  it('shows an error with a retry button, then recovers', async () => {
    server.use(
      http.post(
        '*/v1/farms/:id/recommendations',
        () => problemResponse(503, 'unavailable', 'Busy.'),
        { once: true },
      ),
    );
    renderComparison();
    expect(await screen.findByRole('alert')).toHaveTextContent(/busy right now/i);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect((await screen.findAllByRole('article')).length).toBeGreaterThanOrEqual(3);
  });

  it('explains an expired session on 401', async () => {
    server.use(
      http.post('*/v1/farms/:id/recommendations', () =>
        problemResponse(401, 'unauthorized', 'Expired.'),
      ),
    );
    renderComparison();
    expect(await screen.findByRole('alert')).toHaveTextContent(/session expired/i);
  });

  it('has no axe violations', async () => {
    const { container } = await ready();
    await expectNoAxeViolations(container);
  });

  it('keeps the card short: no dropdown sections, the reasons live on the detail screen', async () => {
    await ready();
    const firstCard = cards()[0];
    expect(firstCard.querySelectorAll('details')).toHaveLength(0);
    expect(within(firstCard).queryByText(/why it was suggested/i)).toBeNull();
    expect(within(firstCard).getByRole('button', { name: /view details/i })).toBeInTheDocument();
  });
});
