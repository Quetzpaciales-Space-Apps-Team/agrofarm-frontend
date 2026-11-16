import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import '../../../i18n';
import { expectNoAxeViolations } from '../../../test/axe';
import { FarmCropMap } from '../components/FarmCropMap';

const boundary = {
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

describe('FarmCropMap', () => {
  it('is a labelled region with a map image inside', () => {
    render(
      <FarmCropMap farmName="Finca La Esperanza" boundary={boundary} label="Season 1: Maize" />,
    );
    expect(screen.getByRole('region', { name: 'Season 1: Maize' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /map of the area around finca la esperanza/i }),
    ).toBeInTheDocument();
  });

  it('draws image tiles and never an embedded frame', () => {
    const { container } = render(<FarmCropMap farmName="Finca" boundary={boundary} crop="maize" />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelectorAll('img.farm-map__tile').length).toBeGreaterThan(10);
    const fill = container.querySelector('polygon.farm-map__outline-fill') as SVGElement;
    expect(fill.getAttribute('style')).toMatch(/url\("?#.*-maize"?\)/);
  });

  it('zooms with labelled buttons', async () => {
    const { container } = render(<FarmCropMap farmName="Finca" boundary={boundary} />);
    const before = container.querySelector('img.farm-map__tile')?.getAttribute('src');
    await userEvent.click(screen.getByRole('button', { name: /zoom in on the map/i }));
    expect(container.querySelector('img.farm-map__tile')?.getAttribute('src')).not.toEqual(before);
  });

  it('renders nothing when the farm has no outline', () => {
    const { container } = render(<FarmCropMap farmName="Finca" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <FarmCropMap farmName="Finca" boundary={boundary} crop="fallow" />,
    );
    await expectNoAxeViolations(container);
  });
});
