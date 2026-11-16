import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import '../../../i18n';
import { ApiProvider } from '../../../services/ApiContext';
import { SessionProvider } from '../../auth/state/session';
import { expectNoAxeViolations } from '../../../test/axe';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { CreateFarmForm } from '../components/CreateFarmForm';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderForm(props = {}) {
  return renderWithApi((api) => {
    api.tokens.set('stub.access.token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <SessionProvider>
          <CreateFarmForm {...props} />
        </SessionProvider>
      </ApiProvider>
    );
  });
}

describe('CreateFarmForm', () => {
  it('renders farm creation fields and passes axe checks', async () => {
    const { container } = renderForm();
    expect(screen.getByRole('heading', { name: /create your farm/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/farm name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/region \/ preset/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/initial crops/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^create farm$/i })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('validates that farm name is required', async () => {
    renderForm();
    const submitBtn = screen.getByRole('button', { name: /^create farm$/i });
    await userEvent.click(submitBtn);
    expect(screen.getByRole('alert')).toHaveTextContent(/please enter a farm name/i);
  });

  it('submits a new farm and triggers onCreated callback', async () => {
    const onCreated = vi.fn();
    renderForm({ onCreated });

    const nameInput = screen.getByLabelText(/farm name/i);
    await userEvent.type(nameInput, 'Finca Santa Elena');

    const cropsInput = screen.getByLabelText(/initial crops/i);
    await userEvent.clear(cropsInput);
    await userEvent.type(cropsInput, 'maize, beans, sorghum');

    const submitBtn = screen.getByRole('button', { name: /^create farm$/i });
    await userEvent.click(submitBtn);

    await vi.waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Finca Santa Elena',
          current_rotation: ['maize', 'beans', 'sorghum'],
        }),
      );
    });
  });
});
