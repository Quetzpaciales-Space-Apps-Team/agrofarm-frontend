import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../../app/App';
import { expectNoAxeViolations } from '../../../test/axe';
import {
  problemResponse,
  setRefreshCookie,
  STUB_ACCOUNT,
  TAKEN_EMAIL,
  TEST_LOGIN,
} from '../../../test/handlers';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderApp = () => renderWithApi((api) => <App client={api.client} tokens={api.tokens} />);

function count(method: 'post' | 'get', path: string) {
  const state = { calls: 0 };
  server.use(
    http[method](`*${path}`, () => {
      state.calls += 1;
      return undefined;
    }),
  );
  return state;
}

async function fillLogin(email = TEST_LOGIN.email, password = TEST_LOGIN.password) {
  await userEvent.type(screen.getByLabelText(/email/i), email);
  await userEvent.type(screen.getByLabelText(/^password/i), password);
}

async function openLogin() {
  await userEvent.click(screen.getByRole('link', { name: /^log in$/i }));
  await screen.findByRole('heading', { name: /^log in$/i });
}

describe('Landing keeps the demo first (G12)', () => {
  it('keeps the demo as the main action in the page and login and register in the header', () => {
    renderApp();
    const demo = screen.getByRole('button', { name: /try the demo/i });
    const login = screen.getByRole('link', { name: /^log in$/i });
    const register = screen.getByRole('link', { name: /create an account/i });
    const header = screen.getByRole('banner');
    const main = screen.getByRole('main');
    expect(main).toContainElement(demo);
    expect(header).toContainElement(login);
    expect(header).toContainElement(register);
  });

  it('does not block the demo while the session restore runs', async () => {
    renderApp();
    expect(screen.getByRole('button', { name: /try the demo/i })).toBeEnabled();
  });
});

describe('Registration page (FE-103)', () => {
  async function openRegister() {
    await userEvent.click(screen.getByRole('link', { name: /create an account/i }));
    await screen.findByRole('heading', { name: /create an account/i });
  }

  it('has labelled fields and no axe violations', async () => {
    const { container } = renderApp();
    await openRegister();
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute('type', 'password');
    await expectNoAxeViolations(container);
  });

  it('moves focus to the page heading when it opens', async () => {
    renderApp();
    await openRegister();
    expect(screen.getByRole('heading', { name: /create an account/i })).toHaveFocus();
  });

  it('shows client errors, links them to the fields, focuses the first one and sends nothing', async () => {
    const register = count('post', '/v1/auth/register');
    const { container } = renderApp();
    await openRegister();
    await userEvent.type(screen.getByLabelText(/^name/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/email/i), 'ana@');
    await userEvent.type(screen.getByLabelText(/^password/i), '123456789');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    const email = screen.getByLabelText(/email/i);
    const password = screen.getByLabelText(/^password/i);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/valid email/i);
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAccessibleDescription(/at least 10 characters/i);
    expect(screen.getByLabelText(/^name/i)).not.toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
    expect(register.calls).toBe(0);
    await expectNoAxeViolations(container);
  });

  it('rejects a password over 72 bytes even when it has fewer than 72 characters', async () => {
    renderApp();
    await openRegister();
    await userEvent.type(screen.getByLabelText(/^name/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/email/i), 'ana@example.test');
    await userEvent.type(screen.getByLabelText(/^password/i), 'é'.repeat(37));
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByLabelText(/^password/i)).toHaveAccessibleDescription(/72 bytes/i);
  });

  it('shows backend field errors on the right fields', async () => {
    server.use(
      http.post('*/v1/auth/register', () =>
        problemResponse(422, 'validation_error', 'Not valid.', [
          { field: 'body.name', message: 'The name has characters we cannot store.' },
          { field: 'email', message: 'This email domain is not accepted.' },
        ]),
      ),
    );
    renderApp();
    await openRegister();
    await userEvent.type(screen.getByLabelText(/^name/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/email/i), 'ana@example.test');
    await userEvent.type(screen.getByLabelText(/^password/i), 'fake-test-pass-01');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/^name/i)).toHaveAccessibleDescription(/cannot store/i),
    );
    expect(screen.getByLabelText(/email/i)).toHaveAccessibleDescription(/domain is not accepted/i);
    expect(screen.getByLabelText(/^password/i)).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^name/i)).toHaveFocus();
  });

  it('explains an email that cannot be used on the email field', async () => {
    renderApp();
    await openRegister();
    await userEvent.type(screen.getByLabelText(/^name/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/email/i), TAKEN_EMAIL);
    await userEvent.type(screen.getByLabelText(/^password/i), 'fake-test-pass-01');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/email/i)).toHaveAccessibleDescription(/log in instead/i),
    );
  });

  it('shows a plain message for a busy server', async () => {
    server.use(
      http.post('*/v1/auth/register', () => problemResponse(429, 'rate_limited', 'Slow.')),
    );
    renderApp();
    await openRegister();
    await userEvent.type(screen.getByLabelText(/^name/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/email/i), 'ana@example.test');
    await userEvent.type(screen.getByLabelText(/^password/i), 'fake-test-pass-01');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many requests/i);
  });

  it('creates the account, logs in and opens the farm dashboard', async () => {
    const { api } = renderApp();
    await openRegister();
    await userEvent.type(screen.getByLabelText(/^name/i), 'Test Farmer');
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(
      await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ }),
    ).toBeInTheDocument();
    expect(api.tokens.get()).toBeTruthy();
  });

  it('disables the button while the request runs', async () => {
    server.use(
      http.post('*/v1/auth/register', async () => {
        await new Promise((r) => setTimeout(r, 50));
        return problemResponse(500, 'server_error', 'Boom.');
      }),
    );
    renderApp();
    await openRegister();
    await userEvent.type(screen.getByLabelText(/^name/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/email/i), 'ana@example.test');
    await userEvent.type(screen.getByLabelText(/^password/i), 'fake-test-pass-01');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    await screen.findByRole('alert');
  });
});

describe('Login page (FE-104)', () => {
  it('has labelled fields and no axe violations', async () => {
    const { container } = renderApp();
    await openLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute('type', 'password');
    expect(
      screen.getByRole('link', { name: /try the demo|back to the demo/i }),
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('validates empty fields on the client and focuses the first error', async () => {
    const login = count('post', '/v1/auth/login');
    renderApp();
    await openLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(screen.getByLabelText(/email/i)).toHaveFocus();
    expect(screen.getByLabelText(/email/i)).toHaveAccessibleDescription(/enter your email/i);
    expect(screen.getByLabelText(/^password/i)).toHaveAccessibleDescription(/enter your password/i);
    expect(login.calls).toBe(0);
  });

  it('logs in and shows the farm dashboard', async () => {
    const { api } = renderApp();
    await openLogin();
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(
      await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ }),
    ).toBeInTheDocument();
    expect(api.tokens.get()).toBeTruthy();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('shows one generic message for a wrong password and for an unknown email', async () => {
    renderApp();
    await openLogin();
    await fillLogin(TEST_LOGIN.email, 'wrong-password-1');
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    const first = (await screen.findByRole('alert')).textContent;
    expect(first).toMatch(/email or password is not correct/i);

    await userEvent.clear(screen.getByLabelText(/email/i));
    await userEvent.type(screen.getByLabelText(/email/i), 'nobody@example.test');
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(first));
    expect(first).not.toContain(TEST_LOGIN.email);
    expect(screen.getByLabelText(/email/i)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the generic message even when the server answers with validation errors', async () => {
    server.use(
      http.post('*/v1/auth/login', () =>
        problemResponse(422, 'validation_error', 'No such user.', [
          { field: 'email', message: 'No account has this email.' },
        ]),
      ),
    );
    renderApp();
    await openLogin();
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/email or password is not correct/i);
    expect(alert).not.toHaveTextContent(/no account/i);
  });

  it.each([
    [429, /too many/i],
    [503, /busy/i],
  ])('explains a %i answer differently from a wrong password', async (status, message) => {
    server.use(http.post('*/v1/auth/login', () => problemResponse(status, 'x', 'Nope.')));
    renderApp();
    await openLogin();
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('explains a network failure', async () => {
    server.use(http.post('*/v1/auth/login', () => HttpResponse.error()));
    renderApp();
    await openLogin();
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be reached/i);
  });

  it('never writes the token or the password to web storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { api } = renderApp();
    await openLogin();
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ });
    expect(api.tokens.get()).toBeTruthy();
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    setItem.mockRestore();
  });
});

describe('Session restore on app start (FE-104)', () => {
  it('keeps the user logged in through POST /v1/auth/refresh when the refresh cookie is valid', async () => {
    setRefreshCookie(true, 'user');
    const refresh = count('post', '/v1/auth/refresh');
    const { api } = renderApp();
    expect(
      await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ }),
    ).toBeInTheDocument();
    expect(refresh.calls).toBeGreaterThanOrEqual(1);
    expect(api.tokens.get()).toBeTruthy();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('restores a demo guest too', async () => {
    setRefreshCookie(true, 'demo');
    renderApp();
    expect(await screen.findByRole('button', { name: /leave the demo/i })).toBeInTheDocument();
  });

  it('stays on the landing page without an error when there is no cookie', async () => {
    const refresh = count('post', '/v1/auth/refresh');
    renderApp();
    await waitFor(() => expect(refresh.calls).toBe(1));
    expect(screen.getByRole('button', { name: /try the demo/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('stays on the landing page when the refresh call fails with a network error', async () => {
    server.use(http.post('*/v1/auth/refresh', () => HttpResponse.error()));
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    expect(await screen.findByRole('heading', { name: /Pilot Farm/ })).toBeInTheDocument();
  });

  it('lets a person who starts the demo win over a restore that finishes later', async () => {
    setRefreshCookie(true, 'user');
    server.use(
      http.post('*/v1/auth/refresh', async () => {
        await new Promise((r) => setTimeout(r, 80));
        return problemResponse(401, 'unauthorized', 'No.');
      }),
    );
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    expect(await screen.findByRole('button', { name: /leave the demo/i })).toBeInTheDocument();
    await act(() => new Promise((r) => setTimeout(r, 120)));
    expect(screen.getByRole('button', { name: /leave the demo/i })).toBeInTheDocument();
  });

  it('shows an account page when the user has no farm yet', async () => {
    setRefreshCookie(true, 'user');
    server.use(http.get('*/v1/farms', () => HttpResponse.json({ items: [], next_cursor: null })));
    renderApp();
    expect(await screen.findByRole('heading', { name: /your account/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(STUB_ACCOUNT.name))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });
});

describe('RequireAuth (FE-105)', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('sends an anonymous visitor of a protected path to login and returns there after login', async () => {
    window.location.hash = '#/farm';
    renderApp();
    expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/login?next=%2Ffarm');
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(
      await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/farm');
  });

  it('waits for the session restore instead of bouncing a returning user to login', async () => {
    setRefreshCookie(true, 'user');
    window.location.hash = '#/farm';
    renderApp();
    expect(
      await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^log in$/i })).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#/farm');
  });

  it('shows a status message while the session is being restored on a protected path', async () => {
    setRefreshCookie(true, 'user');
    server.use(
      http.post('*/v1/auth/refresh', async () => {
        await new Promise((r) => setTimeout(r, 60));
        return HttpResponse.json({ access_token: 'x', token_type: 'bearer', expires_in: 900 });
      }),
    );
    window.location.hash = '#/farm';
    renderApp();
    expect(screen.getByRole('status')).toHaveTextContent(/restoring/i);
    await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ });
  });

  it('sends the user to login, keeping the path, when a 401 cannot be refreshed', async () => {
    const { api } = renderApp();
    await openLogin();
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ });

    setRefreshCookie(false);
    server.use(http.get('*/v1/farms', () => problemResponse(401, 'unauthorized', 'Expired.')));
    await act(async () => {
      await api.client.get('/v1/farms').catch(() => undefined);
    });
    expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/login?next=%2Ffarm');
    expect(api.tokens.get()).toBeNull();
  });

  it('does not let a logged-in user sit on the login page', async () => {
    setRefreshCookie(true, 'user');
    window.location.hash = '#/login';
    renderApp();
    expect(
      await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ }),
    ).toBeInTheDocument();
  });
});

describe('Logout (FE-105)', () => {
  it('calls the API, clears the in-memory token and returns to the start page', async () => {
    const logout = count('post', '/v1/auth/logout');
    const { api } = renderApp();
    await openLogin();
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ });
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    await waitFor(() => expect(logout.calls).toBe(1));
    expect(api.tokens.get()).toBeNull();
    expect(screen.getByRole('button', { name: /try the demo/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Guatemala Pilot Farm/ })).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#/');
  });

  it('does not bounce to login with a return path after an explicit logout', async () => {
    renderApp();
    await openLogin();
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ });
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(screen.queryByRole('heading', { name: /^log in$/i })).not.toBeInTheDocument();
  });

  it('stays logged out after a reload because the refresh cookie was revoked', async () => {
    const first = renderApp();
    await openLogin();
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    await screen.findByRole('heading', { name: /Guatemala Pilot Farm/ });
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    first.unmount();
    renderApp();
    await act(() => new Promise((r) => setTimeout(r, 60)));
    expect(screen.getByRole('button', { name: /try the demo/i })).toBeInTheDocument();
  });

  it('logs out even when the API call fails', async () => {
    server.use(http.post('*/v1/auth/logout', () => HttpResponse.error()));
    const { api } = renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    await userEvent.click(await screen.findByRole('button', { name: /leave the demo/i }));
    expect(api.tokens.get()).toBeNull();
    expect(screen.getByRole('button', { name: /try the demo/i })).toBeInTheDocument();
  });

  it('also revokes the cookie when a demo guest leaves', async () => {
    const logout = count('post', '/v1/auth/logout');
    renderApp();
    await userEvent.click(screen.getByRole('button', { name: /try the demo/i }));
    await userEvent.click(await screen.findByRole('button', { name: /leave the demo/i }));
    await waitFor(() => expect(logout.calls).toBe(1));
    const main = screen.getByRole('main');
    expect(within(main).getByRole('button', { name: /try the demo/i })).toBeInTheDocument();
  });
});
