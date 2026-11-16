import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatArea } from '../../../domain/months';

export interface FarmZoneMapProps {
  farmId?: string;
  farmName: string;
  areaHa: number;
  boundary?: {
    type?: string;
    coordinates?: number[][][];
  };
  onSaveBoundary?: (newBoundary: { type: 'Polygon'; coordinates: number[][][] }) => Promise<void>;
  isSaving?: boolean;
}

const MIN_ZOOM = 10;
const MAX_ZOOM = 18;

function lon2pixel(lon: number, zoom: number) {
  return ((lon + 180) / 360) * Math.pow(2, zoom) * 256;
}

function lat2pixel(lat: number, zoom: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const clamped = Math.max(-0.9999, Math.min(0.9999, sin));
  return (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * Math.pow(2, zoom) * 256;
}

export function FarmZoneMap({
  farmName,
  areaHa,
  boundary,
  onSaveBoundary,
  isSaving = false,
}: FarmZoneMapProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'tiles' | 'vector' | 'embed'>('tiles');
  const [zoomShift, setZoomShift] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 380 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el.clientWidth > 0) {
        setDimensions({
          width: el.clientWidth,
          height: el.clientHeight || 380,
        });
      }
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [activeTab]);

  const initialRing = boundary?.coordinates?.[0] || [];
  const [editRing, setEditRing] = useState<number[][]>(initialRing);

  const ring = isEditing && editRing.length > 0 ? editRing : initialRing;
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

  // Map viewport dimensions
  const viewWidth = dimensions.width;
  const viewHeight = dimensions.height;

  // Start at the highest zoom where the whole farm fits in the frame (with some margin), so the
  // outline is never cut off on a small screen. The zoom buttons move from there. The fit uses the
  // saved outline, so it does not jump while the outline is being edited.
  const fitLons = (initialRing.length > 2 ? initialRing : ring).map((p) => p[0]);
  const fitLats = (initialRing.length > 2 ? initialRing : ring).map((p) => p[1]);
  let fit = MIN_ZOOM;
  for (let z = MAX_ZOOM; z >= MIN_ZOOM; z -= 1) {
    const widthPx = lon2pixel(Math.max(...fitLons), z) - lon2pixel(Math.min(...fitLons), z);
    const heightPx = lat2pixel(Math.min(...fitLats), z) - lat2pixel(Math.max(...fitLats), z);
    if (widthPx <= viewWidth * 0.7 && heightPx <= viewHeight * 0.7) {
      fit = z;
      break;
    }
  }
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit + zoomShift));
  const halfW = viewWidth / 2;
  const halfH = viewHeight / 2;
  const centerPixelX = lon2pixel(centroidLon, zoom);
  const centerPixelY = lat2pixel(centroidLat, zoom);

  // Dynamically calculate tile bounds to cover the entire container width and height
  const minTileX = Math.floor((centerPixelX - halfW) / 256) - 1;
  const maxTileX = Math.floor((centerPixelX + halfW) / 256) + 1;
  const minTileY = Math.floor((centerPixelY - halfH) / 256) - 1;
  const maxTileY = Math.floor((centerPixelY + halfH) / 256) + 1;

  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const tileLeft = tx * 256 - (centerPixelX - halfW);
      const tileTop = ty * 256 - (centerPixelY - halfH);
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
        left: Math.round(tileLeft),
        top: Math.round(tileTop),
      });
    }
  }

  // Projected polygon points on the map tile canvas
  const projectedPolygonPoints = ring
    .map(([lon, lat]) => {
      const x = halfW + (lon2pixel(lon, zoom) - centerPixelX);
      const y = halfH + (lat2pixel(lat, zoom) - centerPixelY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // SVG Normalized Vector calculation
  const svgWidth = 320;
  const svgHeight = 200;
  const pad = 24;
  const lonSpan = maxLon - minLon || 0.001;
  const latSpan = maxLat - minLat || 0.001;

  const normalizedVectorPoints = ring
    .map(([lon, lat]) => {
      const x = pad + ((lon - minLon) / lonSpan) * (svgWidth - 2 * pad);
      const y = svgHeight - pad - ((lat - minLat) / latSpan) * (svgHeight - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Embed iframe parameters
  const padLon = Math.max((maxLon - minLon) * 0.45, 0.008);
  const padLat = Math.max((maxLat - minLat) * 0.45, 0.008);
  const embedBbox = `${(minLon - padLon).toFixed(5)}%2C${(minLat - padLat).toFixed(5)}%2C${(maxLon + padLon).toFixed(5)}%2C${(maxLat + padLat).toFixed(5)}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${embedBbox}&layer=mapnik&marker=${centroidLat.toFixed(5)}%2C${centroidLon.toFixed(5)}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${centroidLat.toFixed(5)}&mlon=${centroidLon.toFixed(5)}#map=15/${centroidLat.toFixed(5)}/${centroidLon.toFixed(5)}`;
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${centroidLat.toFixed(5)},${centroidLon.toFixed(5)}`;

  const formattedArea = formatArea(areaHa, i18n.language);
  const subtitle = `${farmName} • ${formattedArea}`;
  const bboxText = `[${minLon.toFixed(3)}, ${minLat.toFixed(3)}] → [${maxLon.toFixed(3)}, ${maxLat.toFixed(3)}]`;
  const latText = `${centroidLat.toFixed(4)}°`;
  const lonText = `${centroidLon.toFixed(4)}°`;

  // Edit actions: Shifting center location
  const handleShiftLocation = (newLat: number, newLon: number) => {
    const dLat = newLat - centroidLat;
    const dLon = newLon - centroidLon;
    const shifted = ring.map(([lon, lat]) => [
      Number((lon + dLon).toFixed(5)),
      Number((lat + dLat).toFixed(5)),
    ]);
    setEditRing(shifted);
  };

  // Preset location handler
  const handleSelectPresetRegion = (region: string) => {
    switch (region) {
      case 'guatemala':
        handleShiftLocation(14.635, -90.513);
        break;
      case 'corredorSeco':
        handleShiftLocation(14.798, -89.544);
        break;
      case 'altiplano':
        handleShiftLocation(14.835, -91.518);
        break;
      case 'peten':
        handleShiftLocation(16.924, -89.897);
        break;
    }
  };

  // Preset geometry shape
  const handleApplyShapePreset = (shape: 'square' | 'irregular' | 'pilot') => {
    let newCoords: number[][];
    if (shape === 'square') {
      const d = 0.003;
      newCoords = [
        [centroidLon - d, centroidLat - d],
        [centroidLon + d, centroidLat - d],
        [centroidLon + d, centroidLat + d],
        [centroidLon - d, centroidLat + d],
        [centroidLon - d, centroidLat - d],
      ];
    } else if (shape === 'irregular') {
      newCoords = [
        [centroidLon - 0.004, centroidLat - 0.003],
        [centroidLon + 0.003, centroidLat - 0.004],
        [centroidLon + 0.005, centroidLat + 0.001],
        [centroidLon + 0.001, centroidLat + 0.004],
        [centroidLon - 0.004, centroidLat + 0.002],
        [centroidLon - 0.004, centroidLat - 0.003],
      ];
    } else {
      newCoords = [
        [-90.515, 14.633],
        [-90.511, 14.633],
        [-90.511, 14.637],
        [-90.515, 14.637],
        [-90.515, 14.633],
      ];
    }
    setEditRing(newCoords);
  };

  // Vertex update
  const handleVertexChange = (index: number, coordIndex: 0 | 1, val: number) => {
    const updated = editRing.map((p, i) => {
      if (i === index) {
        const copy = [...p];
        copy[coordIndex] = val;
        return copy;
      }
      return p;
    });
    // If updating first point, update last point to keep closed ring
    if (index === 0 && updated.length > 0) {
      updated[updated.length - 1] = [...updated[0]];
    }
    setEditRing(updated);
  };

  // Save changes
  const handleSave = async () => {
    if (!onSaveBoundary) return;
    try {
      await onSaveBoundary({
        type: 'Polygon',
        coordinates: [editRing],
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save boundary:', err);
    }
  };

  return (
    <section aria-labelledby="farm-zone-map-heading" className="farm-zone-map">
      <div className="farm-zone-map__header">
        <div>
          <h4 id="farm-zone-map-heading" className="farm-zone-map__title">
            {t('farm.map.title')}
          </h4>
          <p className="farm-zone-map__subtitle">{subtitle}</p>
        </div>
        <div className="farm-zone-map__actions">
          <div className="farm-zone-map__tabs" role="tablist" aria-label={t('farm.map.title')}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tiles'}
              className={`button button--sm ${activeTab === 'tiles' ? 'button--primary' : 'button--ghost'}`}
              onClick={() => setActiveTab('tiles')}
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
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'embed'}
              className={`button button--sm ${activeTab === 'embed' ? 'button--primary' : 'button--ghost'}`}
              onClick={() => setActiveTab('embed')}
            >
              {t('farm.map.interactiveOsm')}
            </button>
          </div>
          {onSaveBoundary ? (
            <button
              type="button"
              className={`button button--sm ${isEditing ? 'button--secondary' : 'button--primary'}`}
              onClick={() => {
                if (!isEditing) {
                  setEditRing([...ring]);
                }
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? t('farm.map.cancel') : t('farm.map.editButton')}
            </button>
          ) : null}
        </div>
      </div>

      {saveSuccess ? (
        <div className="state state--success" role="status">
          {t('farm.map.saved')}
        </div>
      ) : null}

      <div className="farm-zone-map__content">
        {activeTab === 'tiles' && (
          <div ref={containerRef} className="farm-zone-map__tiles-container">
            <div
              className="farm-zone-map__tiles-viewport"
              style={{ width: '100%', height: '100%' }}
            >
              {tiles.map((tile) => (
                <img
                  key={tile.key}
                  src={tile.url}
                  alt=""
                  aria-hidden="true"
                  className="farm-zone-map__tile-img"
                  style={{ left: `${tile.left}px`, top: `${tile.top}px` }}
                  loading="eager"
                />
              ))}
              <svg
                viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                className="farm-zone-map__overlay-svg"
                role="img"
                aria-label={`Overlay terrain boundary map for ${farmName}`}
              >
                <polygon
                  points={projectedPolygonPoints}
                  fill="rgba(77, 179, 128, 0.35)"
                  stroke="#4db380"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                {ring.map(([lon, lat], i) => {
                  const cx = halfW + (lon2pixel(lon, zoom) - centerPixelX);
                  const cy = halfH + (lat2pixel(lat, zoom) - centerPixelY);
                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r="5"
                      fill="#f0c968"
                      stroke="#141c17"
                      strokeWidth="2"
                    />
                  );
                })}
                <circle
                  cx={halfW}
                  cy={halfH}
                  r="6"
                  fill="#e74c3c"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className="farm-zone-map__zoom-controls">
              <button
                type="button"
                className="button button--sm button--ghost"
                disabled={zoom >= MAX_ZOOM}
                onClick={() => setZoomShift((value) => value + 1)}
                aria-label={t('farm.map.zoomIn')}
              >
                +
              </button>
              <button
                type="button"
                className="button button--sm button--ghost"
                disabled={zoom <= MIN_ZOOM}
                onClick={() => setZoomShift((value) => value - 1)}
                aria-label={t('farm.map.zoomOut')}
              >
                -
              </button>
            </div>
          </div>
        )}

        {activeTab === 'vector' && (
          <div className="farm-zone-map__svg-wrapper">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="farm-zone-map__svg"
              role="img"
              aria-label={`Boundary polygon for ${farmName}`}
            >
              <polygon
                points={normalizedVectorPoints}
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

        {activeTab === 'embed' && (
          <div className="farm-zone-map__frame-wrapper">
            <iframe
              title={`Interactive map of ${farmName}`}
              className="farm-zone-map__iframe"
              src={osmEmbedUrl}
              loading="lazy"
            />
          </div>
        )}

        {isEditing && (
          <div className="farm-zone-map__editor card">
            <h5 className="farm-zone-map__editor-title">{t('farm.map.editTitle')}</h5>
            <p className="farm-zone-map__editor-desc">{t('farm.map.editDescription')}</p>

            <div className="farm-zone-map__editor-section">
              <h6>{t('farm.map.presets')}</h6>
              <div className="farm-zone-map__preset-buttons">
                <button
                  type="button"
                  className="button button--sm button--secondary"
                  onClick={() => handleSelectPresetRegion('guatemala')}
                >
                  {t('farm.create.presets.guatemalaCentral')}
                </button>
                <button
                  type="button"
                  className="button button--sm button--secondary"
                  onClick={() => handleSelectPresetRegion('corredorSeco')}
                >
                  {t('farm.create.presets.corredorSeco')}
                </button>
                <button
                  type="button"
                  className="button button--sm button--secondary"
                  onClick={() => handleSelectPresetRegion('altiplano')}
                >
                  {t('farm.create.presets.altiplano')}
                </button>
                <button
                  type="button"
                  className="button button--sm button--secondary"
                  onClick={() => handleSelectPresetRegion('peten')}
                >
                  {t('farm.create.presets.peten')}
                </button>
              </div>
            </div>

            <div className="farm-zone-map__editor-section">
              <h6>{t('farm.map.shiftLocation')}</h6>
              <div className="farm-zone-map__coord-inputs">
                <label>
                  <span>{t('farm.map.latitude')}</span>
                  <input
                    type="number"
                    step="0.001"
                    value={centroidLat.toFixed(4)}
                    onChange={(e) =>
                      handleShiftLocation(parseFloat(e.target.value) || centroidLat, centroidLon)
                    }
                  />
                </label>
                <label>
                  <span>{t('farm.map.longitude')}</span>
                  <input
                    type="number"
                    step="0.001"
                    value={centroidLon.toFixed(4)}
                    onChange={(e) =>
                      handleShiftLocation(centroidLat, parseFloat(e.target.value) || centroidLon)
                    }
                  />
                </label>
              </div>
            </div>

            <div className="farm-zone-map__editor-section">
              <h6>{t('farm.map.quickPresets')}</h6>
              <div className="farm-zone-map__preset-buttons">
                <button
                  type="button"
                  className="button button--sm button--ghost"
                  onClick={() => handleApplyShapePreset('square')}
                >
                  {t('farm.map.presetSquare')}
                </button>
                <button
                  type="button"
                  className="button button--sm button--ghost"
                  onClick={() => handleApplyShapePreset('irregular')}
                >
                  {t('farm.map.presetIrregular')}
                </button>
                <button
                  type="button"
                  className="button button--sm button--ghost"
                  onClick={() => handleApplyShapePreset('pilot')}
                >
                  {t('farm.map.presetPilot')}
                </button>
              </div>
            </div>

            <div className="farm-zone-map__editor-section">
              <h6>{t('farm.map.vertices')}</h6>
              <div className="farm-zone-map__vertices-list">
                {editRing.slice(0, editRing.length - 1).map((pt, i) => (
                  <div key={i} className="farm-zone-map__vertex-row">
                    <span className="farm-zone-map__vertex-label">{`P${i + 1}`}</span>
                    <input
                      type="number"
                      step="0.0005"
                      value={pt[0]}
                      aria-label={`${t('farm.map.longitude')} P${i + 1}`}
                      onChange={(e) =>
                        handleVertexChange(i, 0, parseFloat(e.target.value) || pt[0])
                      }
                    />
                    <input
                      type="number"
                      step="0.0005"
                      value={pt[1]}
                      aria-label={`${t('farm.map.latitude')} P${i + 1}`}
                      onChange={(e) =>
                        handleVertexChange(i, 1, parseFloat(e.target.value) || pt[1])
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="farm-zone-map__editor-actions">
              <button
                type="button"
                className="button button--primary"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? t('farm.map.saving') : t('farm.map.saveButton')}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  setEditRing([...initialRing]);
                  setIsEditing(false);
                }}
              >
                {t('farm.map.cancel')}
              </button>
            </div>
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
