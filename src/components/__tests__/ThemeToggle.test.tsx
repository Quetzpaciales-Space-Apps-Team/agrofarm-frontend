import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  it('renders a theme toggle button and meets accessibility checks', async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    await expectNoAxeViolations(button);
  });

  it('toggles data-theme between light and dark when clicked', async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    // Click to toggle
    await userEvent.click(button);
    const themeAfterFirstClick = document.documentElement.getAttribute('data-theme');
    expect(['light', 'dark']).toContain(themeAfterFirstClick);
    expect(localStorage.getItem('agrofarm_theme')).toBe(themeAfterFirstClick);

    // Click again to toggle back
    await userEvent.click(button);
    const themeAfterSecondClick = document.documentElement.getAttribute('data-theme');
    expect(themeAfterSecondClick).not.toBe(themeAfterFirstClick);
    expect(localStorage.getItem('agrofarm_theme')).toBe(themeAfterSecondClick);
  });
});
