import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

  it('renders farm zone map heading, tile map overlay and external links', () => {
    render(<FarmZoneMap farmName="Finca La Esperanza" areaHa={12.5} boundary={sampleBoundary} />);

    expect(screen.getByRole('heading', { name: /geographic zone map/i })).toBeInTheDocument();
    expect(screen.getByText(/12\.5 ha/i)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /overlay terrain boundary map for finca la esperanza/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /openstreetmap/i })).toHaveAttribute(
      'href',
      expect.stringContaining('openstreetmap.org'),
    );
    expect(screen.getByRole('link', { name: /google maps/i })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps'),
    );
  });

  it('switches between tile map, vector polygon and embed tabs', async () => {
    const user = userEvent.setup();
    render(<FarmZoneMap farmName="Finca La Esperanza" areaHa={12.5} boundary={sampleBoundary} />);

    const vectorTab = screen.getByRole('tab', { name: /boundary geometry/i });
    await user.click(vectorTab);
    expect(
      screen.getByRole('img', { name: /boundary polygon for finca la esperanza/i }),
    ).toBeInTheDocument();

    const embedTab = screen.getByRole('tab', { name: /openstreetmap view/i });
    await user.click(embedTab);
    expect(screen.getByTitle(/interactive map of finca la esperanza/i)).toBeInTheDocument();
  });

  it('opens editor and saves modified location and geometry', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <FarmZoneMap
        farmName="Finca La Esperanza"
        areaHa={12.5}
        boundary={sampleBoundary}
        onSaveBoundary={handleSave}
      />,
    );

    const editButton = screen.getByRole('button', { name: /edit parcel geometry & location/i });
    await user.click(editButton);

    expect(
      screen.getByRole('heading', { name: /edit parcel geometry & location/i }),
    ).toBeInTheDocument();

    // Click Peten preset
    const petenButton = screen.getByRole('button', { name: /petén/i });
    await user.click(petenButton);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'Polygon',
        coordinates: expect.any(Array),
      }),
    );
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
