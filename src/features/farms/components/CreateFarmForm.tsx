import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../../services/ApiContext';
import { createFarm } from '../../../services/api';
import { useSession } from '../../auth/state/session';
import { navigate } from '../../../services/navigation';
import type { Farm } from '../../../services/types';

export interface CreateFarmFormProps {
  onCreated?: (farm: Farm) => void;
  onCancel?: () => void;
}

interface RegionPreset {
  id: string;
  labelKey: string;
  coordinates: number[][][];
  description: string;
}

const REGION_PRESETS: readonly RegionPreset[] = [
  {
    id: 'guatemala_central',
    labelKey: 'farm.create.presets.guatemalaCentral',
    description: 'Guatemala Central (14.59° N, 90.53° W - ~119 ha)',
    coordinates: [
      [
        [-90.535, 14.585],
        [-90.525, 14.585],
        [-90.525, 14.595],
        [-90.535, 14.595],
        [-90.535, 14.585],
      ],
    ],
  },
  {
    id: 'corredor_seco',
    labelKey: 'farm.create.presets.corredorSeco',
    description: 'Corredor Seco - Chiquimula / Zacapa (14.80° N, 89.54° W - ~110 ha)',
    coordinates: [
      [
        [-89.54, 14.79],
        [-89.53, 14.79],
        [-89.53, 14.8],
        [-89.54, 14.8],
        [-89.54, 14.79],
      ],
    ],
  },
  {
    id: 'altiplano',
    labelKey: 'farm.create.presets.altiplano',
    description: 'Altiplano Occidental - Quetzaltenango (14.84° N, 91.52° W - ~110 ha)',
    coordinates: [
      [
        [-91.52, 14.835],
        [-91.51, 14.835],
        [-91.51, 14.845],
        [-91.52, 14.845],
        [-91.52, 14.835],
      ],
    ],
  },
  {
    id: 'peten',
    labelKey: 'farm.create.presets.peten',
    description: 'Petén - Flores / Tierras Bajas (16.93° N, 89.89° W - ~110 ha)',
    coordinates: [
      [
        [-89.89, 16.92],
        [-89.88, 16.92],
        [-89.88, 16.93],
        [-89.89, 16.93],
        [-89.89, 16.92],
      ],
    ],
  },
  {
    id: 'custom',
    labelKey: 'farm.create.presets.custom',
    description: 'Custom GeoJSON Polygon Coordinates',
    coordinates: [
      [
        [-90.535, 14.585],
        [-90.525, 14.585],
        [-90.525, 14.595],
        [-90.535, 14.595],
        [-90.535, 14.585],
      ],
    ],
  },
] as const;

export function CreateFarmForm({ onCreated, onCancel }: CreateFarmFormProps) {
  const { t } = useTranslation();
  const { client } = useApi();
  const { selectFarm } = useSession();

  const [name, setName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('guatemala_central');
  const [customCoordsText, setCustomCoordsText] = useState(
    JSON.stringify(REGION_PRESETS[0].coordinates, null, 2),
  );
  const [cropsText, setCropsText] = useState('maize, beans');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPreset = REGION_PRESETS.find((p) => p.id === selectedPresetId) ?? REGION_PRESETS[0];

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = REGION_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.id !== 'custom') {
      setCustomCoordsText(JSON.stringify(preset.coordinates, null, 2));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('farm.create.errors.nameRequired'));
      return;
    }

    let coordinates: number[][][];
    try {
      if (selectedPresetId === 'custom') {
        coordinates = JSON.parse(customCoordsText);
        if (
          !Array.isArray(coordinates) ||
          !Array.isArray(coordinates[0]) ||
          coordinates[0].length < 4
        ) {
          throw new Error('Polygon ring must have at least 4 coordinate positions');
        }
      } else {
        coordinates = selectedPreset.coordinates;
      }
    } catch {
      setError(t('farm.create.errors.invalidCoordinates'));
      return;
    }

    const currentRotation = cropsText
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    setLoading(true);
    setError(null);

    try {
      const created = await createFarm(client, {
        name: name.trim(),
        boundary: {
          type: 'Polygon',
          coordinates,
        },
        current_rotation: currentRotation.length > 0 ? currentRotation : ['maize'],
      });

      selectFarm(created.id);
      onCreated?.(created);
      navigate('/farm');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('farm.create.errors.generic');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card create-farm-card stack" onSubmit={handleSubmit} noValidate>
      <div className="toolbar">
        <h3>{t('farm.create.title')}</h3>
      </div>
      <p className="field__hint">{t('farm.create.description')}</p>

      {error ? (
        <div role="alert" className="state--error">
          <p>{error}</p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="farm-name">{t('farm.create.nameLabel')}</label>
        <input
          id="farm-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('farm.create.namePlaceholder')}
          required
          disabled={loading}
          aria-invalid={error ? 'true' : undefined}
        />
      </div>

      <div className="field">
        <label htmlFor="farm-region">{t('farm.create.regionLabel')}</label>
        <select
          id="farm-region"
          value={selectedPresetId}
          onChange={(e) => handlePresetChange(e.target.value)}
          disabled={loading}
        >
          {REGION_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {t(p.labelKey, p.description)}
            </option>
          ))}
        </select>
        <p className="field__hint">{selectedPreset.description}</p>
      </div>

      {selectedPresetId === 'custom' ? (
        <div className="field">
          <label htmlFor="custom-coords">{t('farm.create.customCoordinatesLabel')}</label>
          <textarea
            id="custom-coords"
            rows={5}
            value={customCoordsText}
            onChange={(e) => setCustomCoordsText(e.target.value)}
            disabled={loading}
            className="code-textarea"
          />
          <p className="field__hint">{t('farm.create.customCoordinatesHint')}</p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="farm-crops">{t('farm.create.cropsLabel')}</label>
        <input
          id="farm-crops"
          type="text"
          value={cropsText}
          onChange={(e) => setCropsText(e.target.value)}
          placeholder={t('farm.create.cropsPlaceholder')}
          disabled={loading}
        />
        <p className="field__hint">{t('farm.create.cropsHint')}</p>
      </div>

      <div className="form-actions toolbar">
        {onCancel ? (
          <button
            type="button"
            className="button button--secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {t('common.cancel')}
          </button>
        ) : null}
        <button type="submit" className="button button--primary" disabled={loading}>
          {loading ? t('farm.create.submitting') : t('farm.create.submit')}
        </button>
      </div>
    </form>
  );
}
