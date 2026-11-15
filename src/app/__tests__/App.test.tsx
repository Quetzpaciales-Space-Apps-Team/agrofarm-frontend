import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { problemResponse } from '../../test/handlers';
import { expectNoAxeViolations } from '../../test/axe';
import { renderWithApi } from '../../test/render';
import { server } from '../../test/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderApp = () => renderWithApi((api) => <App client={api.client} tokens={api.tokens} />);

describe('App shell (FE-106)', () => {
  it('renders the application heading in a banner, a main landmark and the disclaimer in the footer', () => {
    renderApp();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /agrofarm/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      /never replaces local agronomic judgment/i,
    );
  });

  it('offers a skip link to the main content', () => {
    renderApp();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute(
      'href',
      '#main',
    );
  });

  it('has no axe violations on the landing view', async () => {
    const { container } = renderApp();
    await expectNoAxeViolations(container);
  });

  it('keeps the disclaimer visible after entering the demo', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    await screen.findByRole('heading', { name: /Pilot Farm/ });
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/never replaces/i);
  });
});

describe('Landing and guest demo entry (FE-090)', () => {
  it('enters the dashboard for the demo farm after clicking "Try the demo"', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    expect(
      await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('119.4 ha')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try the demo/i })).not.toBeInTheDocument();
  });

  it('shows the scenario panel and the rotation comparison on the dashboard', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    expect(
      await screen.findByRole('heading', { name: /what if the weather changes/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /compare rotation strategies/i }),
    ).toBeInTheDocument();
    expect((await screen.findAllByRole('article')).length).toBeGreaterThanOrEqual(3);
  });

  it('keeps dashboard sections available through the navigation', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    await userEvent.click(screen.getByRole('link', { name: /explore scenarios/i }));
    expect(await screen.findByRole('heading', { name: /what if the weather changes/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: /recommendations/i }));
    expect(await screen.findByRole('heading', { name: /compare rotation strategies/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: /climate/i }));
    expect(await screen.findByRole('heading', { name: /climate history/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: /farm data/i }));
    expect(await screen.findByRole('heading', { name: /upload your farm data/i })).toBeInTheDocument();
  });

  it('shows the busy state while the session starts', async () => {
    server.use(
      http.post('*/v1/auth/demo', async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    expect(screen.getByRole('button', { name: /starting the demo/i })).toBeDisabled();
    await screen.findByRole('alert');
  });

  it.each([
    [404, /demo mode is turned off/i],
    [429, /too many/i],
    [503, /demo is full|at capacity/i],
  ])(
    'shows a clear message for a %i answer and keeps the button available',
    async (status, message) => {
      server.use(http.post('*/v1/auth/demo', () => problemResponse(status, 'x', 'Nope.')));
      renderApp();
      await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /try the demo/i })).toBeEnabled(),
      );
    },
  );

  it('lets the visitor leave the demo and return to the landing view', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    await screen.findByRole('heading', { name: /Pilot Farm/ });
    await userEvent.click(screen.getByRole('button', { name: /leave the demo/i }));
    expect(screen.getByRole('button', { name: /try the demo/i })).toBeInTheDocument();
  });
});

describe('Application navigation (FE-108)', () => {
  beforeEach(() => window.history.pushState({}, '', '/'));

  it('shows the primary sections after entering the demo and routes to a section', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    await screen.findByRole('navigation', { name: /main navigation/i });

    expect(screen.getByRole('link', { name: 'My farm' })).toHaveAttribute('href', '#/farm');
    expect(screen.getByRole('link', { name: 'My farm' })).toHaveAttribute('aria-current', 'page');
  });

  it('returns to the landing view when leaving the demo', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ });
    await userEvent.click(screen.getByRole('button', { name: /leave the demo/i }));
    expect(await screen.findByRole('button', { name: /try the demo/i })).toBeInTheDocument();
  });
});

describe('Error boundary', () => {
  it('shows a recoverable message when a view throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ErrorBoundary } = await import('../ErrorBoundary');
    const Boom = () => {
      throw new Error('boom');
    };
    const { render } = await import('@testing-library/react');
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});
