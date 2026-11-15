import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe';
import { Drawer } from '../Drawer';
import { GlossaryTerm } from '../GlossaryTerm';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open details
      </button>
      <button type="button">Outside action</button>
      {open ? (
        <Drawer title="Strategy details" closeLabel="Close details" onClose={() => setOpen(false)}>
          <a href="https://example.org/source">First link</a>
          <button type="button">Inner action</button>
        </Drawer>
      ) : null}
    </div>
  );
}

describe('Drawer (FE-404)', () => {
  it('opens as a modal dialog named by its title and moves focus inside', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open details' }));
    const dialog = screen.getByRole('dialog', { name: 'Strategy details' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('traps focus: Tab and Shift+Tab cycle inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open details' }));
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 8; i += 1) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open details' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes with the close button and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open details' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close details' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('has no axe violations', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open details' }));
    await expectNoAxeViolations(document.body);
  });
});

describe('GlossaryTerm (FE-404)', () => {
  it('shows the definition on focus and hides it on blur', async () => {
    const user = userEvent.setup();
    render(<GlossaryTerm term="ndvi" label="NDVI" />);
    const button = screen.getByRole('button', { name: 'NDVI' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await user.tab();
    expect(button).toHaveFocus();
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent(/vegetation/i);
    expect(button).toHaveAccessibleDescription(tip.textContent ?? '');
    await user.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows on hover and closes with Escape without closing anything else', async () => {
    const user = userEvent.setup();
    render(<GlossaryTerm term="frost_risk" label="frost risk" />);
    await user.hover(screen.getByRole('button', { name: 'frost risk' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('has a definition for each of the five required terms', async () => {
    const user = userEvent.setup();
    for (const term of [
      'evapotranspiration',
      'ndvi',
      'soil_moisture_anomaly',
      'frost_risk',
      'water_balance',
    ] as const) {
      const { unmount } = render(<GlossaryTerm term={term} label={term} />);
      await user.hover(screen.getByRole('button', { name: term }));
      expect(screen.getByRole('tooltip').textContent?.length).toBeGreaterThan(40);
      unmount();
    }
  });
});
