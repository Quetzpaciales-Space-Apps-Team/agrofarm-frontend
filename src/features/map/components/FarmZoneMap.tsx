import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatArea } from '../../../domain/months';

export interface FarmZoneMapProps {
  farmName: string;
  areaHa: number;
  boundary?: {
    type?: string;
    coordinates?: number[][][];
  };
}

export function FarmZoneMap({ farmName, areaHa, boundary }: FarmZoneMapProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'map' | 'vector'>('map');

  const ring = boundary?.coordinates?.[0] || [];
  const hasCoordinates = ring.length > 2;

  if (!hasCoordinates) {
    return (
      <div className="farm-zone-map farm-zone-map--empty">
        <p className="farm-zone-map__notice">{t('farm.map.noCoordinates')}</p>
      </div>
    );
  }

  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const centroidLon = lons.reduce((sum, v) => sum + v, 0) / lons.length;
  const centroidLat = lats.reduce((sum, v) => sum + v, 0) / lats.length;
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const padLon = Math.max((maxLon - minLon) * 0.45, 0.008);
  const padLat = Math.max((maxLat - minLat) * 0.45, 0.008);
  const embedBbox = `${(minLon - padLon).toFixed(5)}%2C${(minLat - padLat).toFixed(5)}%2C${(maxLon + padLon).toFixed(5)}%2C${(maxLat + padLat).toFixed(5)}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${embedBbox}&layer=mapnik&marker=${centroidLat.toFixed(5)}%2C${centroidLon.toFixed(5)}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${centroidLat.toFixed(5)}&mlon=${centroidLon.toFixed(5)}#map=15/${centroidLat.toFixed(5)}/${centroidLon.toFixed(5)}`;
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${centroidLat.toFixed(5)},${centroidLon.toFixed(5)}`;

  // SVG Normalized Polygon calculation
  const svgWidth = 320;
  const svgHeight = 200;
  const pad = 24;
  const lonSpan = maxLon - minLon || 0.001;
  const latSpan = maxLat - minLat || 0.001;

  const points = ring
    .map(([lon, lat]) => {
      const x = pad + ((lon - minLon) / lonSpan) * (svgWidth - 2 * pad);
      const y = svgHeight - pad - ((lat - minLat) / latSpan) * (svgHeight - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const formattedArea = formatArea(areaHa, i18n.language);
  const subtitle = `${farmName} • ${formattedArea}`;
  const bboxText = `[${minLon.toFixed(3)}, ${minLat.toFixed(3)}] → [${maxLon.toFixed(3)}, ${maxLat.toFixed(3)}]`;
  const latText = `${centroidLat.toFixed(4)}°`;
  const lonText = `${centroidLon.toFixed(4)}°`;

  return (
    <section aria-labelledby="farm-zone-map-heading" className="farm-zone-map">
      <div className="farm-zone-map__header">
        <div>
          <h4 id="farm-zone-map-heading" className="farm-zone-map__title">
            {t('farm.map.title')}
          </h4>
          <p className="farm-zone-map__subtitle">{subtitle}</p>
        </div>
        <div className="farm-zone-map__tabs" role="tablist" aria-label={t('farm.map.title')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'map'}
            className={`button button--sm ${activeTab === 'map' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => setActiveTab('map')}
          >
            {t('farm.map.mapView')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'vector'}
            className={`button button--sm ${activeTab === 'vector' ? 'button--primary' : 'button--ghost'}`}
            onClick={() => setActiveTab('vector')}
          >
            {t('farm.map.boundaryVector')}
          </button>
        </div>
      </div>

      <div className="farm-zone-map__content">
        {activeTab === 'map' ? (
          <div className="farm-zone-map__frame-wrapper">
            <iframe
              title={`Interactive map of ${farmName}`}
              className="farm-zone-map__iframe"
              src={osmEmbedUrl}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="farm-zone-map__svg-wrapper">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="farm-zone-map__svg"
              role="img"
              aria-label={`Boundary polygon for ${farmName}`}
            >
              <polygon
                points={points}
                fill="rgba(77, 179, 128, 0.25)"
                stroke="var(--color-primary, #4db380)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {ring.map(([lon, lat], i) => {
                const cx = pad + ((lon - minLon) / lonSpan) * (svgWidth - 2 * pad);
                const cy = svgHeight - pad - ((lat - minLat) / latSpan) * (svgHeight - 2 * pad);
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="4"
                    fill="var(--color-accent, #f0c968)"
                    stroke="#141c17"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>
        )}

        <div className="farm-zone-map__meta">
          <div className="farm-zone-map__coords">
            <span className="farm-zone-map__coord-item">
              <strong>{t('farm.map.latitude')}: </strong>
              {latText}
            </span>
            <span className="farm-zone-map__coord-item">
              <strong>{t('farm.map.longitude')}: </strong>
              {lonText}
            </span>
            <span className="farm-zone-map__coord-item">
              <strong>{t('farm.map.bbox')}: </strong>
              {bboxText}
            </span>
          </div>
          <div className="farm-zone-map__links">
            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="farm-zone-map__link"
            >
              {t('farm.map.openOsm')}
            </a>
            <a
              href={gmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="farm-zone-map__link"
            >
              {t('farm.map.openGmaps')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
