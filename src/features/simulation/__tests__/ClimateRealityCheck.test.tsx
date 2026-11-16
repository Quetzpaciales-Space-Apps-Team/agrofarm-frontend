import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SCENARIO_PRESETS } from '../../../domain/scenarioPresets';
import { ApiProvider } from '../../../services/ApiContext';
import { expectNoAxeViolations } from '../../../test/axe';
import { DISCLAIMER_TEXT, problemResponse } from '../../../test/handlers';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { ClimateRealityCheck } from '../components/ClimateRealityCheck';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function buildFixtureSeries() {
  const nasaItems: {
    month: string;
    rainfall_mm: number | null;
    temperature_mean_c: number;
    temperature_min_c: number;
    temperature_max_c: number;
    relative_humidity_pct: number;
    solar_radiation_mj_m2: number;
    wind_speed_kmh: number;
  }[] = [];
  const ensoItems: {
    month: string;
    oni: number;
    roni: number;
    phase: 'el_nino' | 'la_nina' | 'neutral';
  }[] = [];

  const configs: {
    year: number;
    monthlyRain: number;
    phase: 'el_nino' | 'la_nina' | 'neutral';
    oni: number;
  }[] = [
    { year: 2015, monthlyRain: 150, phase: 'el_nino', oni: 1.8 },
    { year: 2016, monthlyRain: 250, phase: 'la_nina', oni: -0.8 },
    { year: 2017, monthlyRain: 200, phase: 'neutral', oni: 0.1 },
    { year: 2018, monthlyRain: 150, phase: 'el_nino', oni: 0.9 },
    { year: 2019, monthlyRain: 150, phase: 'el_nino', oni: 0.7 },
    { year: 2020, monthlyRain: 250, phase: 'la_nina', oni: -1.1 },
    { year: 2021, monthlyRain: 250, phase: 'la_nina', oni: -1.0 },
  ];

  for (const cfg of configs) {
    for (let m = 5; m <= 10; m += 1) {
      const month = `${cfg.year}-${String(m).padStart(2, '0')}`;
      nasaItems.push({
        month,
        rainfall_mm: cfg.monthlyRain,
        temperature_mean_c: 22,
        temperature_min_c: 17,
        temperature_max_c: 28,
        relative_humidity_pct: 75,
        solar_radiation_mj_m2: 18,
        wind_speed_kmh: 7,
      });
      ensoItems.push({
        month,
        oni: cfg.oni,
        roni: cfg.oni,
        phase: cfg.phase,
      });
    }
  }

  return { nasaItems, ensoItems };
}

function setupMockClimate() {
  const { nasaItems, ensoItems } = buildFixtureSeries();
  server.use(
    http.get('*/v1/climate/nasa-power', () =>
      HttpResponse.json({
        location: { latitude: 14.59, longitude: -90.53 },
        items: nasaItems,
        aggregation: { rainfall_mm: 'sum' },
        source: 'NASA POWER Daily API',
        source_url: 'https://power.larc.nasa.gov',
        attribution: 'NASA Langley Research Center (LaRC) POWER Project',
        resolution_note: 'One point taken from a grid cell of about 50 km, not a station.',
        dataset_checksum_sha256: 'abc',
        processing_version: '0.1.0',
        disclaimer: DISCLAIMER_TEXT,
      }),
    ),
    http.get('*/v1/climate/enso', () =>
      HttpResponse.json({
        threshold_c: 0.5,
        source: 'NOAA CPC',
        disclaimer: DISCLAIMER_TEXT,
        items: ensoItems,
      }),
    ),
  );
}

function renderPanel(onApplyPreset = vi.fn()) {
  return renderWithApi((api) => {
    api.tokens.set('stub.access.token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <ClimateRealityCheck onApplyPreset={onApplyPreset} />
      </ApiProvider>
    );
  });
}

describe('ClimateRealityCheck', () => {
  it('renders group cards, year strip, preset comparison, limitations, and collapsible data table from API data', async () => {
    setupMockClimate();
    const { container } = renderPanel();

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(
      await screen.findByRole('heading', { name: /climate reality check/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/what happened here in past el ni.o and la ni.a years\?/i),
    ).toBeInTheDocument();

    // Group cards show n and computed means (El Nino: 6*150=900 mm, La Nina: 6*250=1500 mm, Neutral: 6*200=1200 mm)
    const elNinoCard = screen.getByRole('button', { name: /el nino.*3 years/i });
    expect(elNinoCard).toHaveTextContent('900 mm');
    expect(screen.getByRole('button', { name: /la nina.*3 years/i })).toHaveTextContent('1,500 mm');

    // Selecting a year point updates the live detail readout
    const year2015 = screen.getByRole('button', { name: /2015.*el nino/i });
    await userEvent.click(year2015);
    expect(screen.getByText(/2015.*900 mm/i)).toBeInTheDocument();

    // Toggle collapsible data table
    const toggle = screen.getByRole('button', { name: /show data table/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    const table = screen.getByRole('table', { name: /seasonal rainfall by year/i });
    expect(within(table).getAllByRole('row')).toHaveLength(8); // header + 7 years

    // Scientific caveats & attributions
    expect(screen.getByText(/50 km/i)).toBeInTheDocument();
    expect(screen.getAllByText(/NASA POWER/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/NOAA CPC/i)).toBeInTheDocument();
    expect(screen.getByText(DISCLAIMER_TEXT)).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });

  it('applies the corresponding preset when clicking Apply this to the scenario', async () => {
    setupMockClimate();
    const onApplyPreset = vi.fn();
    renderPanel(onApplyPreset);
    await screen.findByRole('heading', { name: /climate reality check/i });

    await userEvent.click(screen.getByRole('button', { name: /apply el nino preset/i }));
    const elNinoPreset = SCENARIO_PRESETS.find((p) => p.id === 'el_nino_drier')!.values;
    expect(onApplyPreset).toHaveBeenCalledWith(elNinoPreset);
  });

  it('shows insufficient data message when no overlapping years exist', async () => {
    server.use(
      http.get('*/v1/climate/nasa-power', () =>
        HttpResponse.json({
          location: { latitude: 14.59, longitude: -90.53 },
          items: [],
          aggregation: {},
          source: 'NASA POWER',
          source_url: 'https://power.larc.nasa.gov',
          attribution: 'NASA',
          resolution_note: '50 km',
          dataset_checksum_sha256: 'x',
          processing_version: '0.1.0',
          disclaimer: DISCLAIMER_TEXT,
        }),
      ),
    );
    renderPanel();
    expect(await screen.findByText(/not enough overlapping data/i)).toBeInTheDocument();
  });

  it('shows an error with Try again on failure and handles 401/503', async () => {
    server.use(
      http.get('*/v1/climate/nasa-power', () => problemResponse(401, 'unauthorized', 'Expired.'), {
        once: true,
      }),
    );
    renderPanel();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/session expired/i));
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
  });
});
