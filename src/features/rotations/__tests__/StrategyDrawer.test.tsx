import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
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
  await user.click(trigger);
  return { user, trigger, card };
};

describe('Strategy detail drawer (FE-404)', () => {
  it('opens from a strategy card as a dialog named after the strategy', async () => {
    await ready();
    const { card } = await openFirst();
    const name = within(card).getByRole('heading', { level: 4 }).textContent ?? '';
    expect(screen.getByRole('dialog', { name })).toBeInTheDocument();
  });

  it('shows the five blocks, the score by priority and the review and decision-support notes', async () => {
    await ready();
    await openFirst();
    const dialog = screen.getByRole('dialog');
    for (const heading of [
      /why it was suggested/i,
      /evidence/i,
      /expected benefits/i,
      /information gaps/i,
      /risks to check locally/i,
    ]) {
      expect(within(dialog).getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(within(dialog).getByRole('list', { name: /scores by priority/i })).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/overall score: \d+ out of 100/i);
    expect(dialog).toHaveTextContent(/provisional/i);
    expect(dialog).toHaveTextContent(/local expert/i);
    expect(within(dialog).queryByText(/\bbest\b/i)).not.toBeInTheDocument();
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
    await openFirst();
    const dialog = screen.getByRole('dialog');
    const links = within(dialog).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.org/doc-a');
    expect(links[0]).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(dialog).toHaveTextContent('Source: crop_traits');
  });

  it('provides glossary tooltips for the five terms inside the drawer', async () => {
    await ready();
    await openFirst();
    const dialog = screen.getByRole('dialog');
    for (const name of [
      /evapotranspiration/i,
      /ndvi/i,
      /soil moisture anomaly/i,
      /frost risk/i,
      /water balance/i,
    ]) {
      const term = within(dialog).getAllByRole('button', { name })[0];
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
    await openFirst();
    const why = within(screen.getByRole('dialog'))
      .getByText(/in the dry season/i)
      .closest('li') as HTMLElement;
    expect(within(why).getByRole('button', { name: 'NDVI' })).toBeInTheDocument();
  });

  it('closes with Escape and gives focus back to the card button', async () => {
    await ready();
    const { user, trigger } = await openFirst();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps focus inside while tabbing', async () => {
    await ready();
    const { user } = await openFirst();
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 15; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('has no axe violations with the drawer open', async () => {
    await ready();
    await openFirst();
    await expectNoAxeViolations(document.body);
  });
});
