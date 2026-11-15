import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiProvider } from '../../../services/ApiContext';
import { DEMO_FARM_ID, problemResponse } from '../../../test/handlers';
import { expectNoAxeViolations } from '../../../test/axe';
import { renderWithApi } from '../../../test/render';
import { server } from '../../../test/server';
import { LeafAssessmentPanel } from '../components/LeafAssessmentPanel';

const result = {
  assessment: 'possible_condition',
  candidate: 'common_rust',
  scores: {
    common_rust: 0.96,
    corn_leaf_blight: 0.01,
    gray_leaf_spot: 0.01,
    healthy: 0.01,
    insect_damage: 0.01,
  },
  score_interpretation: 'Model scores are not calibrated probabilities.',
  needs_local_review: true,
  guidance: {
    status: 'needs_local_review',
    next_steps: ['Seek local confirmation.'],
    sources: [{ url: 'https://extension.umn.edu/corn', scope: 'Reference for local review' }],
  },
  limits: ['No external field validation.'],
  provenance: { model_version: 'maize-leaf-lightgbm-0.1.1' },
  disclaimer: 'Supports decisions; does not replace local agronomists.',
};
beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:test-preview'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  server.listen();
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function setup() {
  return renderWithApi((api) => {
    api.tokens.set('test-token');
    return (
      <ApiProvider client={api.client} tokens={api.tokens}>
        <LeafAssessmentPanel farmId={DEMO_FARM_ID} />
      </ApiProvider>
    );
  });
}
const input = () => screen.getByLabelText(/choose a maize leaf photo/i);
const upload = () =>
  userEvent.upload(input(), new File(['image-bytes'], 'leaf.png', { type: 'image/png' }));

describe('maize leaf screening', () => {
  it('previews the selected photo and sends binary bytes only after submission', async () => {
    let calls = 0;
    server.use(
      http.post('*/v1/farms/:farmId/leaves/assess', async ({ request }) => {
        calls++;
        expect(request.headers.get('Content-Type')).toBe('image/png');
        expect(await request.text()).toBe('image-bytes');
        return HttpResponse.json(result);
      }),
    );
    const { container } = setup();
    await upload();
    expect(screen.getByRole('img', { name: /selected maize leaf/i })).toBeInTheDocument();
    expect(calls).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: /assess photo/i }));
    expect(await screen.findByText(/possible match: common rust/i)).toBeInTheDocument();
    expect(calls).toBe(1);
    expect(screen.getByText(/not calibrated probabilities/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /guidance reference/i })).toHaveAttribute(
      'href',
      'https://extension.umn.edu/corn',
    );
    await expectNoAxeViolations(container);
  });

  it('keeps uncertain results uncertain rather than naming the highest score', async () => {
    server.use(
      http.post('*/v1/farms/:farmId/leaves/assess', () =>
        HttpResponse.json({ ...result, assessment: 'uncertain', candidate: null }),
      ),
    );
    setup();
    await upload();
    await userEvent.click(screen.getByRole('button', { name: /assess photo/i }));
    expect(
      await screen.findByText(/could not identify a supported condition/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /possible match/i })).not.toBeInTheDocument();
  });

  it('explains unavailable models and allows retry without a fabricated result', async () => {
    server.use(
      http.post('*/v1/farms/:farmId/leaves/assess', () =>
        problemResponse(503, 'service_unavailable', 'Unavailable.'),
      ),
    );
    setup();
    await upload();
    await userEvent.click(screen.getByRole('button', { name: /assess photo/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not available/i));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('rejects oversized photos before any request', async () => {
    setup();
    await userEvent.upload(
      input(),
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/5 MiB/i);
    expect(screen.getByRole('button', { name: /assess photo/i })).toBeDisabled();
  });

  it('clears the selected photo and has no axe violations', async () => {
    const { container } = setup();
    await upload();
    await userEvent.click(screen.getByRole('button', { name: /clear photo/i }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
