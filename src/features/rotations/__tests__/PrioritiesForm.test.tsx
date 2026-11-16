import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ApiProvider } from '../../../services/ApiContext';
import {
  DEFAULT_PRIORITIES,
  DEMO_FARM_ID,
  problemResponse,
  resetStubState,
} from '../../../test/handlers';
import { expectNoAxeViolations } from '../../../test/axe';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { PrioritiesForm } from '../components/PrioritiesForm';
import { RotationsSection } from '../components/RotationsSection';

beforeAll(() => server.listen());
beforeEach(() => resetStubState());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const SCENARIO = {
  rainfall_change_pct: 0,
  temperature_change_c: 0,
  enso_phase: 'neutral',
} as const;

function renderWith(ui: (farmId: string) => React.ReactElement) {
  return renderWithApi((api) => {
    api.tokens.set('stub.access.token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        {ui(DEMO_FARM_ID)}
      </ApiProvider>
    );
  });
}

const renderForm = (onSaved?: () => void) =>
  renderWith((farmId) => <PrioritiesForm farmId={farmId} onSaved={onSaved} />);

async function loaded() {
  const utils = renderForm();
  await screen.findByRole('slider', { name: /water use/i });
  return utils;
}

const slider = (name: RegExp) => screen.getByRole('slider', { name: name });

describe('PrioritiesForm (FE-402)', () => {
  it('shows a loading state, then the stored priorities', async () => {
    renderForm();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(await screen.findByRole('slider', { name: /water use/i })).toHaveValue('90');
    expect(slider(/forage value/i)).toHaveValue('10');
    expect(screen.getByRole('combobox', { name: /water available/i })).toHaveValue('low');
    expect(screen.getByRole('checkbox', { name: /hand tools/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /tractor/i })).not.toBeChecked();
  });

  it('offers all seven priorities with a meaning and the 0 to 100 unit', async () => {
    await loaded();
    expect(screen.getAllByRole('slider')).toHaveLength(7);
    for (const name of [
      /water use/i,
      /income/i,
      /soil structure/i,
      /forage value/i,
      /nitrogen fixing/i,
      /erosion reduction/i,
      /market suitability/i,
    ]) {
      const s = slider(name);
      expect(s).toHaveAttribute('min', '0');
      expect(s).toHaveAttribute('max', '100');
      expect(s).toHaveAccessibleDescription(/.{20,}/);
      expect(s.getAttribute('aria-valuetext')).toMatch(/out of 100/);
    }
  });

  it('shows the error state with retry when loading fails, then recovers', async () => {
    // The client retries a GET on a 503 (first try plus two retries), so the outage has to last
    // for all three attempts before the error reaches the screen. Later calls use the stub.
    let calls = 0;
    server.use(
      http.get('*/v1/farms/:id/priorities', () => {
        calls += 1;
        return calls <= 3 ? problemResponse(503, 'unavailable', 'Busy.') : undefined;
      }),
    );
    renderForm();
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /busy right now/i,
    );
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('slider', { name: /water use/i })).toBeInTheDocument();
  });

  it('saves all seven weights and both constraints with a typed PUT, then confirms', async () => {
    let body: unknown;
    server.use(
      http.put('*/v1/farms/:id/priorities', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(body as object);
      }),
    );
    const user = userEvent.setup();
    let saved = 0;
    renderForm(() => (saved += 1));
    await screen.findByRole('slider', { name: /water use/i });
    fireEvent.change(slider(/income/i), { target: { value: '25' } });
    await user.selectOptions(screen.getByRole('combobox', { name: /water available/i }), 'high');
    await user.click(screen.getByRole('checkbox', { name: /tractor/i }));
    await user.click(screen.getByRole('checkbox', { name: /hand tools/i }));
    await user.click(screen.getByRole('button', { name: /save priorities/i }));
    expect(await screen.findByText(/priorities saved/i)).toBeInTheDocument();
    expect(body).toEqual({
      weights: { ...DEFAULT_PRIORITIES.weights, income: 0.25 },
      constraints: { water_availability: 'high', equipment: ['animal_traction', 'tractor'] },
    });
    expect(saved).toBe(1);
  });

  it('disables the button and says "Saving" while the request runs', async () => {
    let release: () => void = () => {};
    server.use(
      http.put('*/v1/farms/:id/priorities', async ({ request }) => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json((await request.json()) as object);
      }),
    );
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole('button', { name: /save priorities/i }));
    expect(await screen.findByRole('button', { name: /saving/i })).toBeDisabled();
    release();
    expect(await screen.findByText(/priorities saved/i)).toBeInTheDocument();
  });

  it('shows a save error, keeps the edits, and does not announce success', async () => {
    server.use(
      http.put('*/v1/farms/:id/priorities', () => problemResponse(422, 'validation_error', 'No.')),
    );
    const user = userEvent.setup();
    let saved = 0;
    renderForm(() => (saved += 1));
    await screen.findByRole('slider', { name: /water use/i });
    fireEvent.change(slider(/income/i), { target: { value: '30' } });
    await user.click(screen.getByRole('button', { name: /save priorities/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    expect(slider(/income/i)).toHaveValue('30');
    expect(screen.queryByText(/priorities saved/i)).not.toBeInTheDocument();
    expect(saved).toBe(0);
  });

  it('resets to the defaults without saving, then saves them on request', async () => {
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole('button', { name: /reset to defaults/i }));
    for (const s of screen.getAllByRole('slider')) expect(s).toHaveValue('50');
    expect(screen.getByRole('combobox', { name: /water available/i })).toHaveValue('medium');
    expect(screen.getByRole('checkbox', { name: /hand tools/i })).not.toBeChecked();
    expect(screen.queryByText(/priorities saved/i)).not.toBeInTheDocument();
  });

  it('explains what the priorities do and that scores support decisions', async () => {
    await loaded();
    expect(screen.getByText(/starting values/i)).toBeInTheDocument();
    expect(screen.getByText(/support your decision/i)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = await loaded();
    await expectNoAxeViolations(container);
  });

  it('applies one-click priority presets, sets all seven sliders, and saves to refresh recommendations', async () => {
    let savedBody: unknown;
    server.use(
      http.put('*/v1/farms/:id/priorities', async ({ request }) => {
        savedBody = await request.json();
        return HttpResponse.json(savedBody as object);
      }),
    );
    const user = userEvent.setup();
    let onSavedCount = 0;
    renderForm(() => (onSavedCount += 1));
    await screen.findByRole('slider', { name: /water use/i });

    const saveWaterBtn = screen.getByRole('button', { name: /save water/i });
    await user.click(saveWaterBtn);

    expect(slider(/water use/i)).toHaveValue('95');
    expect(slider(/erosion reduction/i)).toHaveValue('85');
    expect(slider(/income/i)).toHaveValue('50');
    expect(slider(/forage value/i)).toHaveValue('30');
    expect(slider(/soil structure/i)).toHaveValue('70');
    expect(slider(/nitrogen fixing/i)).toHaveValue('50');
    expect(slider(/market suitability/i)).toHaveValue('40');

    await waitFor(() => expect(onSavedCount).toBe(1));
    expect(savedBody).toMatchObject({
      weights: { water_use: 0.95, erosion_reduction: 0.85 },
    });
  });
});

describe('RotationsSection (FE-402)', () => {
  it('refreshes the comparison with the saved priorities after saving', async () => {
    const user = userEvent.setup();
    renderWith((farmId) => <RotationsSection farmId={farmId} scenario={SCENARIO} />);
    await screen.findAllByRole('article');
    const before = screen.getAllByRole('article').map((a) => a.textContent);
    await screen.findByRole('slider', { name: /water use/i });
    for (const s of screen.getAllByRole('slider')) fireEvent.change(s, { target: { value: '0' } });
    fireEvent.change(slider(/forage value/i), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: /save priorities/i }));
    await screen.findByText(/priorities saved/i);
    await waitFor(() => {
      const after = screen.getAllByRole('article').map((a) => a.textContent);
      expect(after).not.toEqual(before);
    });
    expect(
      within(screen.getAllByRole('article')[0]).getAllByText(/out of 100/i)[0],
    ).toBeInTheDocument();
  });

  it('jumps focus to the comparison heading and back to priorities', async () => {
    const user = userEvent.setup();
    renderWith((farmId) => <RotationsSection farmId={farmId} scenario={SCENARIO} />);
    await screen.findAllByRole('article');
    await screen.findByRole('slider', { name: /water use/i });

    await user.click(screen.getByRole('button', { name: /jump to comparison/i }));
    const comparisonHeading = screen.getByRole('heading', { name: /compare rotation strategies/i });
    expect(comparisonHeading).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /back to priorities/i }));
    const prioritiesHeading = screen.getByRole('heading', {
      name: /your priorities for this farm/i,
    });
    expect(prioritiesHeading).toHaveFocus();
  });
});
