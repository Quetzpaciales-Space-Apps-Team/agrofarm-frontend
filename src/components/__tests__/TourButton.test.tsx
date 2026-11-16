import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import '../../i18n';
import { expectNoAxeViolations } from '../../test/axe';
import { TourButton } from '../TourButton';

describe('TourButton', () => {
  it('renders demo tour button with accessible label', () => {
    render(<TourButton />);
    const button = screen.getByRole('button', { name: /start interactive guided demo tour/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/demo tour/i);
  });

  it('handles click without crashing in test environment', async () => {
    const user = userEvent.setup();
    render(<TourButton />);
    const button = screen.getByRole('button', { name: /start interactive guided demo tour/i });
    await user.click(button);
  });

  it('has no axe violations', async () => {
    const { container } = render(<TourButton />);
    await expectNoAxeViolations(container);
  });
});
