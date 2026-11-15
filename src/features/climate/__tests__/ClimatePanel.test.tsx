import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ApiProvider } from '../../../services/ApiContext';
import { DISCLAIMER_TEXT, problemResponse } from '../../../test/handlers';
import { expectNoAxeViolations } from '../../../test/axe';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { ClimatePanel } from '../components/ClimatePanel';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPanel() {
  return renderWithApi((api) => {
    api.tokens.set('stub.access.token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <ClimatePanel />
      </ApiProvider>
    );
  });
}

async function loaded() {
  const utils = renderPanel();
  const chart = await screen.findByRole('img', { name: /rainfall/i });
  return { ...utils, chart };
}

describe('ClimatePanel (FE-091)', () => {
  it('shows a loading state, then an accessible chart with a text summary', async () => {
    renderPanel();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    const chart = await screen.findByRole('img', { name: /monthly rainfall.*temperature/i });
    expect(chart).toHaveAccessibleDescription(/mm.*°C|°C.*mm/);
    expect(chart).toHaveAccessibleDescription(/2 months? (have|has) no data|months with no data/i);
  });

  it('names units on the axes and in the legend', async () => {
    const { chart } = await loaded();
    expect(
      within(chart as unknown as HTMLElement).getByText(/rainfall \(mm per month\)/i),
    ).toBeInTheDocument();
    expect(
      within(chart as unknown as HTMLElement).getByText(/temperature \(°C\)/i),
    ).toBeInTheDocument();
    const legend = screen.getByRole('list', { name: /chart legend/i });
    expect(legend).toHaveTextContent(/rainfall.*mm per month/i);
    expect(legend).toHaveTextContent(/mean temperature.*°C/i);
    expect(legend).toHaveTextContent(/minimum temperature/i);
    expect(legend).toHaveTextContent(/maximum temperature/i);
    expect(legend).toHaveTextContent(/no data/i);
  });

  it('defaults to the last 24 months of the series', async () => {
    await loaded();
    expect(screen.getByLabelText('From')).toHaveValue('2024-01');
    expect(screen.getByLabelText('To')).toHaveValue('2025-12');
    await userEvent.click(screen.getByRole('button', { name: /show data table/i }));
    const table = screen.getByRole('table', { name: /monthly climate data/i });
    expect(within(table).getAllByRole('row')).toHaveLength(25); // header + 24 months
    expect(within(table).getByRole('rowheader', { name: 'Jan 2024' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Dec 2025' })).toBeInTheDocument();
  });

  it('draws months with null values as gaps, never as zero, and lists them as no data', async () => {
    const { container } = await loaded();
    // 24 months, rainfall null in 2024-02 and 2025-04: 22 bars.
    expect(container.querySelectorAll('svg.chart rect.bar')).toHaveLength(22);
    // Mean temperature is null only in 2024-02: the line is split in two segments.
    expect(container.querySelectorAll('svg.chart path.line--mean')).toHaveLength(2);

    const list = screen.getByRole('list', { name: /months with no data/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(list).toHaveTextContent(/Feb 2024/);
    expect(list).toHaveTextContent(/Apr 2025/);

    await userEvent.click(screen.getByRole('button', { name: /show data table/i }));
    const table = screen.getByRole('table', { name: /monthly climate data/i });
    const feb = within(table).getByRole('row', { name: /Feb 2024/ });
    expect(within(feb).getAllByText(/no data/i).length).toBeGreaterThanOrEqual(4);
    expect(feb).not.toHaveTextContent(/\b0(\.0+)?\b/);
  });

  it('toggles the data table with the keyboard and tells assistive tech its state', async () => {
    await loaded();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /show data table/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    const hide = screen.getByRole('button', { name: /hide data table/i });
    expect(hide).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows source, attribution, resolution note and the response disclaimer next to the chart', async () => {
    await loaded();
    const source = screen.getByRole('region', { name: /data source/i });
    expect(source).toHaveTextContent(/NASA POWER Daily API/);
    expect(source).toHaveTextContent(/Langley Research Center/);
    expect(source).toHaveTextContent(/reanalysis, not a station measurement/i);
    expect(source).toHaveTextContent(DISCLAIMER_TEXT);
  });

  it('changes the range and keeps From before To', async () => {
    await loaded();
    await userEvent.selectOptions(screen.getByLabelText('To'), '2024-06');
    await userEvent.click(screen.getByRole('button', { name: /show data table/i }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(7);
    await userEvent.selectOptions(screen.getByLabelText('From'), '2025-01');
    expect(screen.getByLabelText('To')).toHaveValue('2025-01');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
  });

  it('shows the ENSO phase of each month in the same range, with text labels and the source', async () => {
    await loaded();
    const strip = screen.getByRole('list', { name: /El Nino and La Nina phase by month/i });
    const cells = within(strip).getAllByRole('listitem');
    expect(cells).toHaveLength(24);
    expect(cells[0]).toHaveTextContent('Jan 24');
    expect(cells[0]).toHaveTextContent('EN');
    expect(cells[0]).toHaveTextContent(/El Nino/);
    expect(within(strip).getAllByText('LN').length).toBeGreaterThan(0);
    expect(within(strip).getAllByText('NE').length).toBeGreaterThan(0);
    expect(screen.getByText(/NOAA CPC/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('From'), '2025-07');
    expect(
      within(screen.getByRole('list', { name: /El Nino and La Nina phase/i })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(6);
  });

  it('marks a month the ENSO series does not cover as no data', async () => {
    server.use(
      http.get('*/v1/climate/enso', () =>
        HttpResponse.json({
          threshold_c: 0.5,
          source: 'NOAA CPC',
          disclaimer: DISCLAIMER_TEXT,
          items: [{ month: '2024-01', oni: 1, roni: 1, phase: 'el_nino' }],
        }),
      ),
    );
    await loaded();
    const strip = screen.getByRole('list', { name: /El Nino and La Nina phase by month/i });
    expect(within(strip).getAllByText(/no data/i).length).toBe(23);
  });

  it('shows an empty state when the API has no climate data', async () => {
    server.use(
      http.get('*/v1/climate/nasa-power', () =>
        HttpResponse.json({
          location: { latitude: 1, longitude: 1 },
          items: [],
          aggregation: {},
          source: 's',
          source_url: 'https://power.larc.nasa.gov',
          attribution: 'a',
          resolution_note: 'r',
          dataset_checksum_sha256: 'x',
          processing_version: '1',
          disclaimer: 'd',
        }),
      ),
    );
    renderPanel();
    expect(await screen.findByText(/no climate data/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows an error with a retry button, then recovers', async () => {
    server.use(
      http.get('*/v1/climate/nasa-power', () => problemResponse(500, 'internal_error', 'Boom.'), {
        once: true,
      }),
    );
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('img', { name: /rainfall/i })).toBeInTheDocument();
  });

  it('explains an expired session on 401', async () => {
    server.use(
      http.get('*/v1/climate/nasa-power', () => problemResponse(401, 'unauthorized', 'Expired.')),
    );
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent(/session expired/i);
  });

  it('has no axe violations, with the data table open', async () => {
    const { container } = await loaded();
    await userEvent.click(screen.getByRole('button', { name: /show data table/i }));
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    await expectNoAxeViolations(container);
  });
});
