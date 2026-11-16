import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import '../../../i18n';
import { expectNoAxeViolations } from '../../../test/axe';
import { FarmZoneMap } from '../components/FarmZoneMap';

describe('FarmZoneMap', () => {
  const sampleBoundary = {
    type: 'Polygon',
    coordinates: [
      [
        [-90.535, 14.585],
        [-90.525, 14.585],
        [-90.525, 14.595],
        [-90.535, 14.595],
        [-90.535, 14.585],
      ],
    ],
  };

  it('renders farm zone map heading, coordinates and external links', () => {
    render(<FarmZoneMap farmName="Finca La Esperanza" areaHa={12.5} boundary={sampleBoundary} />);

    expect(screen.getByRole('heading', { name: /geographic zone map/i })).toBeInTheDocument();
    expect(screen.getByText(/12\.5 ha/i)).toBeInTheDocument();
    expect(screen.getByTitle(/interactive map of finca la esperanza/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /openstreetmap/i })).toHaveAttribute(
      'href',
      expect.stringContaining('openstreetmap.org'),
    );
    expect(screen.getByRole('link', { name: /google maps/i })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps'),
    );
  });

  it('switches between interactive map and vector polygon tabs', async () => {
    const user = userEvent.setup();
    render(<FarmZoneMap farmName="Finca La Esperanza" areaHa={12.5} boundary={sampleBoundary} />);

    const vectorTab = screen.getByRole('tab', { name: /boundary geometry/i });
    await user.click(vectorTab);

    expect(
      screen.getByRole('img', { name: /boundary polygon for finca la esperanza/i }),
    ).toBeInTheDocument();
  });

  it('renders an empty notice when coordinates are empty', () => {
    render(<FarmZoneMap farmName="No Boundary Farm" areaHa={5} />);
    expect(screen.getByText(/no geographic boundary coordinates recorded/i)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <FarmZoneMap farmName="Finca La Esperanza" areaHa={12.5} boundary={sampleBoundary} />,
    );
    await expectNoAxeViolations(container);
  });
});
