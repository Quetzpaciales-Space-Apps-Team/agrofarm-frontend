import { screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import '../../../i18n';
import { ApiProvider } from '../../../services/ApiContext';
import { DEMO_FARM_ID, problemResponse } from '../../../test/handlers';
import { expectNoAxeViolations } from '../../../test/axe';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { FarmDashboard } from '../components/FarmDashboard';
import userEvent from '@testing-library/user-event';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDashboard() {
  return renderWithApi((api) => {
    api.tokens.set('stub.access.token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <FarmDashboard farmId={DEMO_FARM_ID} />
      </ApiProvider>
    );
  });
}

describe('FarmDashboard', () => {
  it('shows a loading state, then the farm name, area in hectares and the current rotation', async () => {
    renderDashboard();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(
      await screen.findByRole('heading', { name: /Guatemala Pilot Farm \(Provisional\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('119.4 ha')).toBeInTheDocument();
    const rotation = screen.getByRole('list', { name: /current rotation/i });
    expect(rotation).toHaveTextContent('Maize');
    expect(rotation).toHaveTextContent('Fallow');
  });

  it('has no axe violations once loaded', async () => {
    const { container } = renderDashboard();
    await screen.findByRole('heading', { name: /Pilot Farm/ });
    await expectNoAxeViolations(container);
  });

  it('shows an error with a retry button when the API fails, then recovers', async () => {
    server.use(
      http.get('*/v1/farms/:id', () => problemResponse(500, 'internal_error', 'Boom.'), {
        once: true,
      }),
    );
    renderDashboard();
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: /Pilot Farm/ })).toBeInTheDocument();
  });

  it('explains an expired session on 401', async () => {
    server.use(http.get('*/v1/farms/:id', () => problemResponse(401, 'unauthorized', 'Expired.')));
    renderDashboard();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /session.*expired|start the demo again/i,
    );
  });

  it('shows an empty state when the farm has no rotation recorded', async () => {
    server.use(
      http.get('*/v1/farms/:id', async ({ request }) => {
        const url = new URL(request.url);
        void url;
        return new Response(
          JSON.stringify({
            id: DEMO_FARM_ID,
            name: 'Empty Farm',
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
            current_rotation: [],
            created_at: '2026-11-14T15:05:00Z',
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Empty Farm' })).toBeInTheDocument(),
    );
    expect(screen.getByText(/no rotation recorded/i)).toBeInTheDocument();
  });
});
