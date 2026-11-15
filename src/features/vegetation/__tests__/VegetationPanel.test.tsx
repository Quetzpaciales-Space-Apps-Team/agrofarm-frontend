import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { ApiProvider } from '../../../services/ApiContext';
import { DEMO_FARM_ID } from '../../../test/handlers';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { expectNoAxeViolations } from '../../../test/axe';
import { VegetationPanel } from '../components/VegetationPanel';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const scenario = {
  rainfall_change_pct: -30,
  temperature_change_c: 1,
  enso_phase: 'el_nino' as const,
};
const setup = () =>
  renderWithApi((api) => (
    <ApiProvider client={api.client} tokens={api.tokens}>
      <VegetationPanel farmId={DEMO_FARM_ID} scenario={scenario} />
    </ApiProvider>
  ));
it('requests the selected scenario explicitly and discloses failed validation alongside quantiles', async () => {
  let calls = 0;
  server.use(
    http.post('*/v1/farms/:farmId/vegetation/simulate', async ({ request }) => {
      calls++;
      expect(await request.json()).toEqual(scenario);
      return HttpResponse.json({
        target: 'seasonal_peak_ndvi_anomaly_pct',
        unit: '%',
        baseline: { p10: -10, p50: 0, p90: 10 },
        scenario: { p10: -12, p50: -3, p90: 8 },
        attributions: [{ feature: 'rain_anom_pct', contribution: -3 }],
        explained_median_delta: -3,
        out_of_range_inputs: ['rain_anom_pct'],
        reference_cell: { cell_id: '14.575_-90.525', distance_km: 1.4, resolution_degrees: 0.05 },
        validation: {
          acceptance_rule_met: false,
          skill_improvement_pct: 4.41,
          required_improvement_pct: 5,
          annual_mean_correlation: 0.127,
          interval_coverage: 0.756,
          years: 25,
        },
        limitations: ['Not parcel yield.'],
        disclaimer: 'Supports local decisions.',
        provenance: { model_version: 'ndvi-vegetation-outlook-0.1.0' },
      });
    }),
  );
  const { container } = setup();
  expect(calls).toBe(0);
  await userEvent.click(screen.getByRole('button', { name: 'Estimate regional greenness' }));
  expect(await screen.findByText(/4.41%/)).toBeInTheDocument();
  expect(screen.getByText(/75.6%/)).toBeInTheDocument();
  expect(screen.getByRole('table', { name: /NDVI anomaly/ })).toHaveTextContent('-3.00');
  expect(screen.getByText(/Outside training range/)).toBeInTheDocument();
  await expectNoAxeViolations(container);
});
it('shows service failures and allows retry without inventing an estimate', async () => {
  server.use(
    http.post(
      '*/v1/farms/:farmId/vegetation/simulate',
      () => new HttpResponse(null, { status: 503 }),
    ),
  );
  setup();
  await userEvent.click(screen.getByRole('button', { name: 'Estimate regional greenness' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
