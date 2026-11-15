import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ApiProvider } from '../../../services/ApiContext';
import { DEMO_FARM_ID, problemResponse, simulateStub } from '../../../test/handlers';
import { expectNoAxeViolations } from '../../../test/axe';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { ScenarioPanel } from '../components/ScenarioPanel';
import { ScenarioProvider } from '../state/scenario';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPanel() {
  return renderWithApi((api) => {
    api.tokens.set('stub.access.token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <ScenarioProvider debounceMs={20}>
          <ScenarioPanel farmId={DEMO_FARM_ID} />
        </ScenarioProvider>
      </ApiProvider>
    );
  });
}

const rain = () => screen.getByRole('slider', { name: /rainfall change/i });
const temp = () => screen.getByRole('slider', { name: /temperature change/i });

async function ready() {
  const utils = renderPanel();
  await screen.findByRole('img', { name: /baseline.*scenario/i });
  return utils;
}

describe('ScenarioPanel (FE-304)', () => {
  it('shows a loading state, then labelled native sliders with the contract limits', async () => {
    renderPanel();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    await ready();
    expect(rain()).toHaveAttribute('type', 'range');
    expect(rain()).toHaveAttribute('min', '-80');
    expect(rain()).toHaveAttribute('max', '100');
    expect(rain()).toHaveAttribute('step', '5');
    expect(temp()).toHaveAttribute('min', '-5');
    expect(temp()).toHaveAttribute('max', '8');
    expect(temp()).toHaveAttribute('step', '0.5');
    expect(screen.getByLabelText(/enso phase/i)).toHaveValue('neutral');
  });

  it('lists the demo farm crops (without fallow) in the crop select', async () => {
    await ready();
    const select = screen.getByLabelText('Crop');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Maize']);
  });

  it('shows the current value and unit next to each slider', async () => {
    await ready();
    fireEvent.change(rain(), { target: { value: '-20' } });
    fireEvent.change(temp(), { target: { value: '1.5' } });
    expect(screen.getByText('-20 %')).toBeInTheDocument();
    expect(screen.getByText('+1.5 °C')).toBeInTheDocument();
  });

  it('shows baseline versus scenario with p10, p50 and p90 and names the unit and target in plain words', async () => {
    await ready();
    fireEvent.change(rain(), { target: { value: '-20' } });
    fireEvent.change(temp(), { target: { value: '1' } });
    await userEvent.selectOptions(screen.getByLabelText(/enso phase/i), 'el_nino');
    const table = await screen.findByRole('table', { name: /baseline and scenario/i });
    await waitFor(() => expect(table).toHaveTextContent('-15.5 %'));
    expect(table).toHaveTextContent('-27.5 %');
    expect(table).toHaveTextContent('-4.5 %');
    expect(table).toHaveTextContent('-12 %'); // baseline low
    expect(table).toHaveTextContent('11 %'); // baseline high
    expect(screen.getByText(/change in yield compared with a normal year/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /baseline.*scenario/i })).toHaveAccessibleDescription(
      /10th.*90th|likely range/i,
    );
  });

  it('debounces calls: many quick changes make one request', async () => {
    let calls = 0;
    server.use(
      http.post('*/v1/scenarios/simulate', async ({ request }) => {
        calls += 1;
        const body = (await request.json()) as { crop: string; scenario: object };
        return HttpResponse.json({ crop: body.crop, ...simulateStub(body.scenario) });
      }),
    );
    await ready();
    expect(calls).toBe(1);
    for (const value of ['-5', '-10', '-15', '-20', '-25']) {
      fireEvent.change(rain(), { target: { value } });
    }
    await screen.findByText(/-11\.3 %|-11\.2 %|-11\.25 %/).catch(() => undefined);
    await waitFor(() => expect(calls).toBe(2));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(calls).toBe(2);
  });

  it('lists the attributions as signed bars sorted by size', async () => {
    await ready();
    fireEvent.change(rain(), { target: { value: '-20' } });
    fireEvent.change(temp(), { target: { value: '1' } });
    await userEvent.selectOptions(screen.getByLabelText(/enso phase/i), 'el_nino');
    await waitFor(() => {
      const list = screen.getByRole('list', { name: /what drives the change/i });
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent(/rainfall/i);
      expect(items[0]).toHaveTextContent('-9 %');
      expect(items[0]).toHaveTextContent(/lowers/i);
      expect(items[1]).toHaveTextContent('-4 %');
      expect(items[2]).toHaveTextContent('-2.5 %');
    });
  });

  it('warns about inputs outside the training range and names them', async () => {
    await ready();
    expect(screen.queryByText(/outside the range/i)).not.toBeInTheDocument();
    fireEvent.change(rain(), { target: { value: '-70' } });
    const warning = await screen.findByText(/outside the range the model was trained on/i);
    expect(warning.closest('[role="alert"]')).toHaveTextContent(/rainfall change/i);
    expect(warning.closest('[role="alert"]')).not.toHaveTextContent(/temperature change/i);
  });

  it('says in plain language that a stub model uses fixed rules, not a trained model', async () => {
    await ready();
    expect(screen.getByText(/fixed rules, not from a trained model/i)).toBeInTheDocument();
  });

  it('does not show the stub notice for a real model name', async () => {
    server.use(
      http.post('*/v1/scenarios/simulate', async ({ request }) => {
        const body = (await request.json()) as { crop: string; scenario: object };
        const result = simulateStub(body.scenario);
        return HttpResponse.json({
          crop: body.crop,
          ...result,
          provenance: {
            ...result.provenance,
            model_name: 'lightgbm-yield',
            model_version: '1.2.0',
          },
        });
      }),
    );
    await ready();
    expect(screen.queryByText(/fixed rules/i)).not.toBeInTheDocument();
  });

  it('shows provenance: model name, version, data versions and when it was generated', async () => {
    await ready();
    const block = screen.getByRole('region', { name: /where these numbers come from/i });
    expect(block).toHaveTextContent('agrofarm-stub');
    expect(block).toHaveTextContent('stub-0.1.0');
    expect(block).toHaveTextContent(/insivumeh_daily/);
    expect(block).toHaveTextContent('2026-11-14');
    expect(block).toHaveTextContent(/Nov 14, 2026/);
    expect(block).toHaveTextContent(/does not replace farmers/i);
  });

  it('resets the scenario with the reset button', async () => {
    await ready();
    fireEvent.change(rain(), { target: { value: '40' } });
    await userEvent.selectOptions(screen.getByLabelText(/enso phase/i), 'la_nina');
    await userEvent.click(screen.getByRole('button', { name: /reset scenario/i }));
    expect(rain()).toHaveValue('0');
    expect(temp()).toHaveValue('0');
    expect(screen.getByLabelText(/enso phase/i)).toHaveValue('neutral');
  });

  it('shows an error with a retry button, then recovers', async () => {
    server.use(
      http.post('*/v1/scenarios/simulate', () => problemResponse(500, 'internal_error', 'Boom.'), {
        once: true,
      }),
    );
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('img', { name: /baseline.*scenario/i })).toBeInTheDocument();
  });

  it('explains an expired session on 401', async () => {
    server.use(
      http.post('*/v1/scenarios/simulate', () => problemResponse(401, 'unauthorized', 'Expired.')),
    );
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent(/session expired/i);
  });

  it('shows an empty state when the farm has no crops to simulate', async () => {
    server.use(
      http.get('*/v1/farms/:id', () =>
        HttpResponse.json({
          id: DEMO_FARM_ID,
          name: 'Fallow Farm',
          boundary: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
          area_ha: 3,
          current_rotation: ['fallow'],
          created_at: '2026-11-14T15:05:00Z',
        }),
      ),
    );
    renderPanel();
    expect(await screen.findByText(/no crops recorded/i)).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = await ready();
    await expectNoAxeViolations(container);
  });
});
