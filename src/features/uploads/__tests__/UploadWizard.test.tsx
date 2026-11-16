import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../i18n';
import { ApiProvider } from '../../../services/ApiContext';
import { DEMO_FARM_ID, problemResponse, readMultipartFile } from '../../../test/handlers';
import { expectNoAxeViolations } from '../../../test/axe';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { UploadWizard } from '../components/UploadWizard';
import { CSV_COLUMNS, buildTemplateCsv } from '../domain/schema';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const HEADER = CSV_COLUMNS.join(',');
const GOOD_ROW =
  'p_1,2025,maize,2025-05-15,2025-10-20,2.5,14.5892,-90.5315,3200,rainfed,6.2,3.1,42,18.5,165,980.5,fake note';
const BAD_ROW = 'p_2,2025,maize,15/05/2025,,2.5,14.5,-90.5,,,,,,,,,';
const csvFile = (rows: string[], name = 'farm.csv') =>
  new File([[HEADER, ...rows].join('\n')], name, { type: 'text/csv' });

function renderWizard() {
  const user = userEvent.setup({ applyAccept: false });
  const view = renderWithApi((api) => {
    api.tokens.set('stub.access.token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <UploadWizard farmId={DEMO_FARM_ID} />
      </ApiProvider>
    );
  });
  return { user, ...view };
}

async function chooseFile(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.upload(screen.getByLabelText(/file to upload/i), file);
}

let createObjectURL: ReturnType<typeof vi.fn>;
let anchorClick: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  createObjectURL = vi.fn(() => 'blob:fake');
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
  anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => anchorClick.mockRestore());

describe('UploadWizard', () => {
  it('always says that uploaded data is stored and checked but not used for results yet', () => {
    renderWizard();
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(/not used/i);
    expect(note).toHaveTextContent(/recommendations/i);
    expect(note).toHaveTextContent(/support.*not replace|does not replace/i);
  });

  it('downloads the CSV template generated in the browser', async () => {
    const { user } = renderWizard();
    await user.click(screen.getByRole('button', { name: /download the csv template/i }));
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(await blob.text()).toBe(buildTemplateCsv());
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(screen.getByText(/example values|replace the example/i)).toBeInTheDocument();
  });

  it('parses a file, shows counts and a preview of the first rows with missing values marked', async () => {
    const { user } = renderWizard();
    await chooseFile(user, csvFile([GOOD_ROW, ...Array.from({ length: 6 }, () => GOOD_ROW)]));
    expect(await screen.findByRole('heading', { name: /check your file/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/7 rows read/i);
    const table = screen.getByRole('table', { name: /preview/i });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 5);
    expect(screen.queryByRole('table', { name: /problems/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send to the server/i })).toBeEnabled();
  });

  it('shows client-side row errors by row and column and marks empty cells as empty, not zero', async () => {
    const { user } = renderWizard();
    await chooseFile(user, csvFile([GOOD_ROW, BAD_ROW]));
    const problems = await screen.findByRole('table', { name: /problems found/i });
    const row = within(problems).getByRole('row', { name: /2.*sowing_date/i });
    expect(row).toHaveTextContent(/YYYY-MM-DD/);
    const preview = screen.getByRole('table', { name: /preview/i });
    expect(within(preview).getAllByText(/empty/i).length).toBeGreaterThan(0);
    expect(within(preview).queryByText('0')).not.toBeInTheDocument();
  });

  it('blocks a file that is too large before any request is made', async () => {
    const requests = vi.fn();
    server.events.on('request:start', requests);
    const { user } = renderWizard();
    const big = csvFile([GOOD_ROW]);
    Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 });
    await chooseFile(user, big);
    expect(await screen.findByRole('alert')).toHaveTextContent(/too large.*2 MB/i);
    expect(requests).not.toHaveBeenCalled();
    server.events.removeListener('request:start', requests);
  });

  it('rejects an unsupported file type and a file with missing columns', async () => {
    const { user } = renderWizard();
    await chooseFile(user, new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/\.csv.*\.geojson/i);
    await user.upload(screen.getByLabelText(/file to upload/i), new File(['crop\nmaize'], 'a.csv'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot be sent/i);
    const table = screen.getByRole('table', { name: /problems found/i });
    expect(table).toHaveTextContent('season_year');
    expect(table).toHaveTextContent(/missing required column/i);
    expect(screen.queryByRole('button', { name: /send to the server/i })).not.toBeInTheDocument();
  });

  it('sends the file with an idempotency key, shows progress, then an honest summary', async () => {
    let seen: { key: string | null; auth: string | null; name: string } | null = null;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post('*/v1/farms/:farmId/uploads', async ({ request }) => {
        const file = await readMultipartFile(request);
        seen = {
          key: request.headers.get('idempotency-key'),
          auth: request.headers.get('authorization'),
          name: file?.name ?? '',
        };
        await gate;
        return HttpResponse.json(
          {
            id: '33333333-3333-4333-8333-333333333333',
            farm_id: DEMO_FARM_ID,
            filename: 'farm.csv',
            format: 'csv',
            status: 'accepted',
            rows_total: 2,
            rows_accepted: 2,
            errors: [],
            created_at: '2026-11-15T10:00:00Z',
          },
          { status: 201 },
        );
      }),
    );
    const { user } = renderWizard();
    await chooseFile(user, csvFile([GOOD_ROW, GOOD_ROW]));
    await user.click(await screen.findByRole('button', { name: /send to the server/i }));
    expect(await screen.findByRole('progressbar', { name: /sending/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/sending farm\.csv/i);
    release();
    expect(await screen.findByRole('heading', { name: /file accepted/i })).toBeInTheDocument();
    expect(seen).toEqual({
      key: expect.stringMatching(/\S{8,}/),
      auth: 'Bearer stub.access.token',
      name: 'farm.csv',
    });
    const summary = screen.getByRole('region', { name: /upload result/i });
    expect(within(summary).getByText(/rows read/i).parentElement).toHaveTextContent('2');
    expect(within(summary).getByText(/rows stored/i).parentElement).toHaveTextContent('2');
    expect(summary).toHaveTextContent(/not used/i);
    expect(summary.textContent).not.toMatch(
      /improv|personali[sz]|tailor|calibrat(ed|ion) (to|for|with)|better recommendations/i,
    );
    await expectNoAxeViolations(summary);
  });

  it('shows the server row errors on the right rows and columns, and never trusts the client check', async () => {
    server.use(
      http.post('*/v1/farms/:farmId/uploads', () =>
        HttpResponse.json(
          {
            id: '44444444-4444-4444-8444-444444444444',
            farm_id: DEMO_FARM_ID,
            filename: 'farm.csv',
            format: 'csv',
            status: 'accepted_with_errors',
            rows_total: 3,
            rows_accepted: 2,
            errors: [{ row: 3, column: 'yield_kg_ha', message: 'Server says: bad yield.' }],
            created_at: '2026-11-15T10:00:00Z',
          },
          { status: 201 },
        ),
      ),
    );
    const { user } = renderWizard();
    await chooseFile(user, csvFile([GOOD_ROW, GOOD_ROW, GOOD_ROW]));
    expect(screen.queryByRole('table', { name: /problems found/i })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /send to the server/i }));
    expect(
      await screen.findByRole('heading', { name: /accepted with row errors/i }),
    ).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /problems found by the server/i });
    const row = within(table).getByRole('row', { name: /3.*yield_kg_ha.*bad yield/i });
    expect(row).toBeInTheDocument();
    expect(screen.getByText(/rows not stored/i).parentElement).toHaveTextContent('1');
  });

  it('says plainly that nothing was stored when the server rejects the file', async () => {
    server.use(
      http.post('*/v1/farms/:farmId/uploads', () =>
        HttpResponse.json(
          {
            id: '55555555-5555-4555-8555-555555555555',
            farm_id: DEMO_FARM_ID,
            filename: 'farm.csv',
            format: 'csv',
            status: 'rejected',
            rows_total: 0,
            rows_accepted: 0,
            errors: [{ row: 1, column: 'season_year', message: 'Missing required column.' }],
            created_at: '2026-11-15T10:00:00Z',
          },
          { status: 201 },
        ),
      ),
    );
    const { user } = renderWizard();
    await chooseFile(user, csvFile([GOOD_ROW]));
    await user.click(await screen.findByRole('button', { name: /send to the server/i }));
    expect(await screen.findByRole('heading', { name: /file rejected/i })).toBeInTheDocument();
    expect(screen.getByText(/no rows were stored/i)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /problems found by the server/i })).toHaveTextContent(
      'season_year',
    );
  });

  it.each([
    [413, 'payload_too_large', 'Uploaded file exceeds size limit.', /too large/i],
    [422, 'validation_error', 'Unsupported file format.', /Unsupported file format/],
    [401, 'unauthorized', 'Missing or invalid access token.', /session expired/i],
  ])(
    'shows a clear error for a %i response and lets the user retry',
    async (status, code, detail, expected) => {
      server.use(
        http.post('*/v1/farms/:farmId/uploads', () => problemResponse(status, code, detail)),
      );
      const { user } = renderWizard();
      await chooseFile(user, csvFile([GOOD_ROW]));
      await user.click(await screen.findByRole('button', { name: /send to the server/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(expected);
      expect(screen.getByRole('button', { name: /send to the server/i })).toBeEnabled();
    },
  );

  it('works against the default mock handler: the stub reports the empty parcel_id on row 1', async () => {
    const { user } = renderWizard();
    await chooseFile(user, csvFile([',2025,maize,2025-05-15,,2.5,14.5,-90.5,,,,,,,,,', GOOD_ROW]));
    await user.click(await screen.findByRole('button', { name: /send to the server/i }));
    expect(
      await screen.findByRole('heading', { name: /accepted with row errors/i }),
    ).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /problems found by the server/i });
    expect(within(table).getByRole('row', { name: /1.*parcel_id/i })).toBeInTheDocument();
  });

  it('accepts a GeoJSON file and shows its preview', async () => {
    const geo = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-90.53, 14.58],
                [-90.52, 14.58],
                [-90.52, 14.59],
                [-90.53, 14.58],
              ],
            ],
          },
          properties: {
            parcel_id: 'g_1',
            season_year: 2025,
            crop: 'maize',
            sowing_date: '2025-05-15',
            area_ha: 1.5,
          },
        },
      ],
    });
    const { user } = renderWizard();
    await chooseFile(user, new File([geo], 'farm.geojson', { type: 'application/geo+json' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/1 row read/i);
    expect(screen.getByRole('table', { name: /preview/i })).toHaveTextContent('g_1');
  });

  it('has no axe violations on the template, review and problem views', async () => {
    const { user, container } = renderWizard();
    await expectNoAxeViolations(container);
    await chooseFile(user, csvFile([GOOD_ROW, BAD_ROW]));
    await screen.findByRole('table', { name: /problems found/i });
    await expectNoAxeViolations(container);
  });

  it('can start over with another file', async () => {
    const { user } = renderWizard();
    await chooseFile(user, csvFile([GOOD_ROW]));
    await user.click(await screen.findByRole('button', { name: /choose another file/i }));
    expect(screen.getByLabelText(/file to upload/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('table', { name: /preview/i })).not.toBeInTheDocument(),
    );
  });

  it('loads a sample file with one click from Try with a sample file', async () => {
    server.use(
      http.get('*/samples/farm-valid.csv', () =>
        HttpResponse.text([HEADER, GOOD_ROW].join('\n'), {
          headers: { 'Content-Type': 'text/csv' },
        }),
      ),
    );
    const { user } = renderWizard();
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /^valid csv/i }));
    expect(await screen.findByRole('heading', { name: /check your file/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/1 row read/i);
  });

  it('accepts a dropped file in the accessible dropzone', async () => {
    const { user } = renderWizard();
    await user.click(screen.getByRole('button', { name: /continue/i }));
    const dropzone = screen.getByRole('button', { name: /drop.*file.*or browse/i });
    const file = csvFile([GOOD_ROW], 'dropped.csv');
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    expect(await screen.findByRole('heading', { name: /check your file/i })).toBeInTheDocument();
    expect(screen.getByText(/dropped\.csv/i)).toBeInTheDocument();
  });

  it('downloads a CSV error report when the server returns row errors', async () => {
    server.use(
      http.post('*/v1/farms/:id/uploads', () =>
        HttpResponse.json(
          {
            id: 'u2',
            farm_id: DEMO_FARM_ID,
            filename: 'farm.csv',
            format: 'csv',
            status: 'accepted_with_errors',
            rows_total: 2,
            rows_accepted: 1,
            errors: [{ row: 2, column: 'sowing_date', message: '=BAD() date' }],
            created_at: '2026-11-15T10:00:00Z',
          },
          { status: 201 },
        ),
      ),
    );
    const { user } = renderWizard();
    await chooseFile(user, csvFile([GOOD_ROW]));
    await user.click(await screen.findByRole('button', { name: /send to the server/i }));
    await screen.findByRole('heading', { name: /accepted with row errors/i });

    await user.click(screen.getByRole('button', { name: /download error report/i }));
    const blob = createObjectURL.mock.calls.at(-1)?.[0] as Blob;
    const text = await blob.text();
    expect(text).toContain('row,column,message');
    expect(text).toContain('2,sowing_date');
    expect(text).toContain("'=BAD() date");
    expect(anchorClick).toHaveBeenCalled();
  });
});
