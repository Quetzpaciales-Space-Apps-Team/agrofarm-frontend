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

  it('says in plain words where the farm is and how big it is', () => {
    render(<FarmZoneMap farmName="Finca La Esperanza" areaHa={12.5} boundary={sampleBoundary} />);

    expect(screen.getByRole('heading', { name: /where your farm is/i })).toBeInTheDocument();
    expect(screen.getByText(/finca la esperanza covers/i)).toHaveTextContent(/12\.5 ha/i);
    expect(screen.getByText(/finca la esperanza covers/i)).toHaveTextContent(/football fields/i);
    expect(
      screen.getByRole('img', { name: /map of the area around finca la esperanza/i }),
    ).toBeInTheDocument();
  });

  it('draws the map with image tiles, never an embedded frame (the CSP blocks frames)', () => {
    const { container } = render(
      <FarmZoneMap farmName="Finca La Esperanza" areaHa={12.5} boundary={sampleBoundary} />,
    );
    expect(container.querySelector('iframe')).toBeNull();
    const tiles = container.querySelectorAll('img.farm-map__tile');
    expect(tiles.length).toBeGreaterThan(10);
    expect(tiles[0]).toHaveAttribute('src', expect.stringContaining('tile.openstreetmap.org'));
    expect(container.querySelector('polygon.farm-map__outline-fill')).not.toBeNull();
  });

  it('zooms in and out with labelled buttons', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FarmZoneMap farmName="Finca La Esperanza" areaHa={12.5} boundary={sampleBoundary} />,
    );
    const before = container.querySelector('img.farm-map__tile')?.getAttribute('src');
    await user.click(screen.getByRole('button', { name: /zoom in on the map/i }));
    const after = container.querySelector('img.farm-map__tile')?.getAttribute('src');
    expect(after).not.toEqual(before);
  });

  it('keeps coordinates out of the way, inside technical details', () => {
    render(<FarmZoneMap farmName="Finca La Esperanza" areaHa={12.5} boundary={sampleBoundary} />);
    expect(screen.getByText(/technical details/i).closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('link', { name: /open in openstreetmap/i })).toHaveAttribute(
      'href',
      expect.stringContaining('openstreetmap.org'),
    );
    expect(screen.getByRole('link', { name: /open in google maps/i })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps'),
    );
  });

  it('renders an empty notice when coordinates are empty', () => {
    render(<FarmZoneMap farmName="No Boundary Farm" areaHa={5} />);
    expect(screen.getByText(/no map outline yet/i)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <FarmZoneMap farmName="Finca La Esperanza" areaHa={12.5} boundary={sampleBoundary} />,
    );
    await expectNoAxeViolations(container);
  });
});
