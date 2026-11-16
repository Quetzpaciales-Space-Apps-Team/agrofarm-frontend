import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiProvider } from '../../../services/ApiContext';
import { DEMO_FARM_ID, DISCLAIMER_TEXT, recommendStub } from '../../../test/handlers';
import { expectNoAxeViolations } from '../../../test/axe';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { RotationComparison } from '../components/RotationComparison';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const SCENARIO = {
  rainfall_change_pct: 0,
  temperature_change_c: 0,
  enso_phase: 'neutral',
} as const;

function serve(mutate: (strategies: Record<string, unknown>[]) => void = () => {}) {
  const strategies = structuredClone(recommendStub(SCENARIO)) as unknown as Record<
    string,
    unknown
  >[];
  mutate(strategies);
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

async function ready() {
  const utils = renderWithApi((api) => {
    api.tokens.set('stub.access.token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <RotationComparison farmId={DEMO_FARM_ID} scenario={SCENARIO} />
      </ApiProvider>
    );
  });
  await screen.findAllByRole('article');
  return utils;
}

const openFirst = async () => {
  const user = userEvent.setup();
  const card = screen.getAllByRole('article')[0];
  const trigger = within(card).getByRole('button', { name: /details/i });
  const name = within(card).getByRole('heading', { level: 4 }).textContent ?? '';
  await user.click(trigger);
  const screenEl = await screen.findByRole('article', { name });
  return { user, trigger, card, screenEl, name };
};

describe('Strategy detail screen', () => {
  it('opens as a screen of its own, named after the strategy, in place of the list', async () => {
    await ready();
    const { screenEl, name } = await openFirst();
    expect(within(screenEl).getByRole('heading', { level: 3, name })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /compare rotation strategies/i })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows a photo for each crop of the strategy in a banner, in order', async () => {
    await ready();
    const { screenEl } = await openFirst();
    const strip = within(screenEl).getByRole('list', { name: /crops in order/i });
    expect(strip.querySelectorAll('img')).toHaveLength(2);
    expect(strip).toHaveTextContent(/season 1/i);
    expect(strip).toHaveTextContent(/season 2/i);
  });

  it('says in plain words what happens in each season', async () => {
    await ready();
    const { screenEl } = await openFirst();
    expect(
      within(screenEl).getByRole('heading', { name: /what happens in each season/i }),
    ).toBeInTheDocument();
    expect(within(screenEl).getByRole('heading', { name: /season 1: maize/i })).toBeInTheDocument();
    expect(screenEl).toHaveTextContent(/takes a lot of water/i);
  });

  it('draws the farm for each season with the crop on top', async () => {
    await ready();
    const { screenEl } = await openFirst();
    expect(
      await within(screenEl).findByRole('region', {
        name: /seen from above in season 1: maize/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(screenEl).getByRole('region', { name: /seen from above in season 2: black beans/i }),
    ).toBeInTheDocument();
    expect(screenEl.querySelectorAll('polygon.farm-map__outline-fill')).toHaveLength(2);
  });

  it('shows the five blocks, the score by priority and the review and decision-support notes', async () => {
    await ready();
    const { screenEl } = await openFirst();
    for (const heading of [
      /why it was suggested/i,
      /evidence/i,
      /expected benefits/i,
      /information gaps/i,
      /risks to check locally/i,
    ]) {
      expect(within(screenEl).getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(within(screenEl).getByRole('list', { name: /scores by priority/i })).toBeInTheDocument();
    expect(screenEl).toHaveTextContent(/overall score: \d+ out of 100/i);
    expect(screenEl).toHaveTextContent(/provisional/i);
    expect(screenEl).toHaveTextContent(/local expert/i);
    expect(within(screenEl).queryByText(/\bbest\b/i)).not.toBeInTheDocument();
  });

  it('links an evidence source only when the item has a URL, and never invents one', async () => {
    serve((strategies) => {
      const first = strategies[0] as { evidence: Record<string, string>[] };
      first.evidence = [
        { statement: 'Has a link.', source: 'doc_a', url: 'https://example.org/doc-a' },
        { statement: 'No link here.', source: 'crop_traits' },
      ];
      strategies.forEach((s, i) => {
        if (i > 0) (s as { overall_score: number }).overall_score = 0.01;
      });
    });
    await ready();
    const { screenEl } = await openFirst();
    const links = within(screenEl)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('https://example.org'));
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.org/doc-a');
    expect(links[0]).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screenEl).toHaveTextContent('Source: crop_traits');
  });

  it('provides glossary tooltips for the five terms on the screen', async () => {
    await ready();
    const { screenEl } = await openFirst();
    for (const name of [
      /evapotranspiration/i,
      /ndvi/i,
      /soil moisture anomaly/i,
      /frost risk/i,
      /water balance/i,
    ]) {
      const term = within(screenEl).getAllByRole('button', { name })[0];
      await userEvent.hover(term);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await userEvent.unhover(term);
    }
  });

  it('turns a glossary term inside strategy text into a tooltip trigger', async () => {
    serve((strategies) => {
      (strategies[0] as { why: string[] }).why = ['Low NDVI in the dry season.'];
      strategies.forEach((s, i) => {
        if (i > 0) (s as { overall_score: number }).overall_score = 0.01;
      });
    });
    await ready();
    const { screenEl } = await openFirst();
    const why = within(screenEl)
      .getByText(/in the dry season/i)
      .closest('li') as HTMLElement;
    expect(within(why).getByRole('button', { name: 'NDVI' })).toBeInTheDocument();
  });

  it('goes back to the comparison and puts focus on its title', async () => {
    await ready();
    const { user } = await openFirst();
    await user.click(screen.getByRole('button', { name: /back to the comparison/i }));
    expect(
      await screen.findByRole('heading', { name: /compare rotation strategies/i }),
    ).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(screen.getByRole('heading', { name: /compare rotation strategies/i })).toHaveFocus(),
    );
  });

  it('has no axe violations on the screen', async () => {
    await ready();
    await openFirst();
    await screen.findByRole('region', { name: /seen from above in season 1/i });
    await expectNoAxeViolations(document.body);
  });
});
