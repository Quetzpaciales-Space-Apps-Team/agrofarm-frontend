import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../i18n';
import { expectNoAxeViolations } from '../../../test/axe';
import { LandingFooter } from '../LandingFooter';

const open = () => {
  render(<LandingFooter />);
  return screen.getByRole('region', { name: /the team behind agrofarm/i });
};

describe('LandingFooter', () => {
  it('lists the six team members, each linking to their GitHub profile', () => {
    const footer = open();
    for (const handle of [
      'eldmark',
      'jdivass',
      'MarceloDetlefsen',
      'JorgeVilledaS',
      'angcoder-c',
      'MagicBag-tab',
    ]) {
      const link = within(footer).getByRole('link', { name: new RegExp(`^${handle}`) });
      expect(link).toHaveAttribute('href', `https://github.com/${handle}`);
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });

  it('links the four repositories of the organization with a plain description each', () => {
    const footer = open();
    for (const repo of [
      'agrofarm-frontend',
      'agrofarm-api',
      'agrofarm-analytic',
      'agrofarm-docs',
    ]) {
      expect(within(footer).getByRole('link', { name: new RegExp(`^${repo}`) })).toHaveAttribute(
        'href',
        `https://github.com/Quetzpaciales-Space-Apps-Team/${repo}`,
      );
    }
    expect(footer).toHaveTextContent(/the web app you are using/i);
    expect(footer).toHaveTextContent(/models, data and experiments/i);
  });

  it('shows the copyright, the NASA non-endorsement note and the photo credits', () => {
    const footer = open();
    expect(footer).toHaveTextContent('© 2026 Quetzpaciales Space Apps Team. All rights reserved.');
    expect(footer).toHaveTextContent(/not affiliated with or endorsed by nasa/i);
    expect(within(footer).getByRole('link', { name: /photo credits/i })).toHaveAttribute(
      'href',
      expect.stringContaining('CREDITS.md'),
    );
  });

  it('tells screen reader users that the links open in a new tab', () => {
    const footer = open();
    expect(within(footer).getAllByText(/opens in a new tab/i).length).toBeGreaterThanOrEqual(11);
  });

  it('has no axe violations', async () => {
    render(<LandingFooter />);
    await expectNoAxeViolations(document.body);
  });
});
