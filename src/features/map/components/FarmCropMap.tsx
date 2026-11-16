import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CropId } from '../../../domain/crops';

export interface FarmCropMapProps {
  farmName: string;
  boundary?: {
    type?: string;
    coordinates?: number[][][];
  };
  /** Shows what is growing on the plot, as a pattern inside the outline. */
  crop?: CropId;
  /** Names the map for screen readers. */
  label?: string;
}

/** Fill patterns that suggest each crop seen from above. */
function CropPatterns({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`${id}-maize`} width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#5aa02c" fillOpacity="0.62" />
        <path d="M4 0v16M12 0v16" stroke="#1d4935" strokeWidth="2" />
        <circle cx="4" cy="5" r="2" fill="#e8bf58" />
        <circle cx="12" cy="11" r="2" fill="#e8bf58" />
      </pattern>
      <pattern id={`${id}-black_beans`} width="14" height="14" patternUnits="userSpaceOnUse">
        <rect width="14" height="14" fill="#3d7a45" fillOpacity="0.62" />
        <path d="M0 3.5h14M0 10.5h14" stroke="#14281f" strokeWidth="2" />
        <ellipse cx="4" cy="7" rx="2" ry="1.3" fill="#20382c" />
        <ellipse cx="10" cy="14" rx="2" ry="1.3" fill="#20382c" />
      </pattern>
      <pattern id={`${id}-cover_crop`} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#9ccb6c" fillOpacity="0.62" />
        <circle cx="2.5" cy="3" r="1.6" fill="#3d7a45" />
        <circle cx="7.5" cy="7.5" r="1.6" fill="#3d7a45" />
      </pattern>
      <pattern id={`${id}-fallow`} width="18" height="18" patternUnits="userSpaceOnUse">
        <rect width="18" height="18" fill="#c9a66b" fillOpacity="0.62" />
        <circle cx="5" cy="5" r="1.2" fill="#8a6a3a" />
        <circle cx="14" cy="12" r="1.2" fill="#8a6a3a" />
      </pattern>
    </defs>
  );
}

const TILE = 256;
const COLUMNS = [-3, -2, -1, 0, 1, 2, 3] as const;
const ROWS = [-1, 0, 1] as const;
const MIN_ZOOM = 5;
const MAX_ZOOM = 19;

/** Web Mercator: longitude and latitude to pixels of the whole world at a zoom level. */
function project(lon: number, lat: number, zoom: number) {
  const world = TILE * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * world,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world,
  };
}

/** The highest zoom at which the whole farm outline still fits comfortably in the frame. */
function fitZoom(minLon: number, maxLon: number, minLat: number, maxLat: number) {
  for (let zoom = 18; zoom > MIN_ZOOM; zoom -= 1) {
    const a = project(minLon, maxLat, zoom);
    const b = project(maxLon, minLat, zoom);
    if (b.x - a.x <= 380 && b.y - a.y <= 150) return zoom;
  }
  return MIN_ZOOM;
}

/** A small map of the farm with the crop drawn on top of the plot (used by the strategy screen). */
export function FarmCropMap({ farmName, boundary, crop, label }: FarmCropMapProps) {
  const { t } = useTranslation();
  const patternId = useId().replace(/:/g, '');
  const [zoomShift, setZoomShift] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);

  const ring = boundary?.coordinates?.[0] || [];
  if (ring.length <= 2) return null;

  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const baseZoom = fitZoom(minLon, maxLon, minLat, maxLat);
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, baseZoom + zoomShift));
  const center = project(centerLon, centerLat, zoom);
  const worldTiles = 2 ** zoom;
  const centerTileX = Math.floor(center.x / TILE);
  const centerTileY = Math.floor(center.y / TILE);

  const tiles = ROWS.flatMap((dy) =>
    COLUMNS.map((dx) => {
      const tileX = centerTileX + dx;
      const tileY = centerTileY + dy;
      return {
        key: `${zoom}-${tileX}-${tileY}`,
        src:
          tileY < 0 || tileY >= worldTiles
            ? null
            : `https://tile.openstreetmap.org/${zoom}/${((tileX % worldTiles) + worldTiles) % worldTiles}/${tileY}.png`,
        left: tileX * TILE - center.x,
        top: tileY * TILE - center.y,
      };
    }),
  );

  const points = ring
    .map(([lon, lat]) => {
      const p = project(lon, lat, zoom);
      return `${(p.x - center.x).toFixed(1)},${(p.y - center.y).toFixed(1)}`;
    })
    .join(' ');

  return (
    <section aria-label={label ?? farmName} className="farm-map farm-map--compact">
      <div className="farm-map__frame">
        <div
          className="farm-map__stage"
          role="img"
          aria-label={t('farm.cropMap.alt', { name: farmName })}
        >
          {tiles.map((tile) =>
            tile.src ? (
              <img
                key={tile.key}
                className="farm-map__tile"
                src={tile.src}
                alt=""
                width={TILE}
                height={TILE}
                draggable={false}
                style={{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }}
                onError={() => setTilesFailed(true)}
              />
            ) : null,
          )}
          <svg className="farm-map__outline" width="1" height="1" aria-hidden="true">
            <CropPatterns id={patternId} />
            <polygon points={points} className="farm-map__outline-halo" />
            <polygon
              points={points}
              className="farm-map__outline-fill"
              style={crop ? { fill: `url(#${patternId}-${crop})` } : undefined}
            />
          </svg>
        </div>
        <div className="farm-map__zoom">
          <button
            type="button"
            className="farm-map__zoom-btn"
            aria-label={t('farm.cropMap.zoomIn')}
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoomShift((value) => value + 1)}
          >
            +
          </button>
          <button
            type="button"
            className="farm-map__zoom-btn"
            aria-label={t('farm.cropMap.zoomOut')}
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoomShift((value) => value - 1)}
          >
            {'\u2212'}
          </button>
        </div>
        <p className="farm-map__credit">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('farm.cropMap.credit')}
          </a>
        </p>
      </div>
      {tilesFailed ? (
        <p role="status" className="farm-map__notice">
          {t('farm.cropMap.tilesFailed')}
        </p>
      ) : null}
    </section>
  );
}
