import { http, HttpResponse } from 'msw';
import type { components } from '../infrastructure/api/schema';

type Schemas = components['schemas'];

const STUB_HEADERS = {
  'X-Stub': 'true',
  'X-Request-Id': 'req-msw-stub-001',
};

export const DISCLAIMER_TEXT =
  'Decision support only: these predictions and crop rotation comparisons carry uncertainty and do not replace the judgment of farmers or local agronomists. INSIVUMEH station observations are preliminary point measurements in Guatemala City.';

export const STUB_PROVENANCE: Schemas['Provenance'] = {
  model_name: 'lightgbm-guatemala-yield-anomaly',
  model_version: '0.1.0-stub',
  data_versions: [
    {
      dataset_id: 'climate_insivumeh_daily',
      version: '2025.1',
      source: 'INSIVUMEH Guatemala City Station',
      date_range: '1995-01-01/2025-12-31',
      spatial_resolution: 'point (14.5869, -90.5328)',
      is_preliminary: true,
    },
    {
      dataset_id: 'chirps_v3_rainfall',
      version: '3.0.2025',
      source: 'UCSB CHG CHIRPS v3',
      date_range: '1981-01-01/2025-10-31',
      spatial_resolution: '0.05 deg (~5.5 km)',
      is_preliminary: false,
    },
  ],
  input_hash: 'sha256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
  generated_at: '2025-11-14T12:00:00Z',
};

export const STUB_USER: Schemas['UserProfile'] = {
  id: 'usr_gt_001',
  email: 'farmer@example.gt',
  full_name: 'Maria Ixchel',
  role: 'farmer',
  created_at: '2025-11-01T08:30:00Z',
};

export const STUB_FARMS: Schemas['Farm'][] = [
  {
    id: 'farm_insivumeh_001',
    name: 'Finca Experimental INSIVUMEH',
    department: 'Guatemala',
    municipality: 'Guatemala City',
    reference_point: {
      latitude: 14.5869,
      longitude: -90.5328,
    },
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [-90.534, 14.586],
          [-90.5315, 14.586],
          [-90.5315, 14.588],
          [-90.534, 14.588],
          [-90.534, 14.586],
        ],
      ],
    },
    area_ha: 4.8,
    elevation_m: 1502,
    current_rotation: ['maize'],
    station_reference: 'INSIVUMEH Central (Zone 13, Guatemala City)',
    created_at: '2025-11-01T09:00:00Z',
    updated_at: '2025-11-10T15:20:00Z',
  },
];

export const STUB_LAYERS: Schemas['MapLayer'][] = [
  {
    id: 'chirps_rainfall_anomaly',
    name: 'Rainfall Anomaly (CHIRPS v3)',
    category: 'climate',
    description:
      'Monthly rainfall anomaly in percent relative to 1991-2020 climatology (~1,280 mm/year at INSIVUMEH Guatemala City, 93% between May and October).',
    tile_url_template: 'https://tiles.example.gt/clean/chirps_v3/{z}/{x}/{y}.png',
    legend: {
      unit: '%',
      palette_name: 'BrBG-colorblind-safe',
      color_blind_safe: true,
      stops: [
        { value: -50, color: '#8c510a', label: '-50% (severe deficit)' },
        { value: 0, color: '#f5f5f5', label: '0% (normal)' },
        { value: 50, color: '#01665e', label: '+50% (surplus)' },
      ],
    },
    source: {
      provider: 'UCSB Climate Hazards Center',
      dataset_id: 'chirps_v3_rainfall',
      version: '3.0.2025',
      spatial_resolution: '0.05 deg (~5.5 km)',
      date_range: '1981-01-01/2025-10-31',
      measurement_type: 'satellite_derived',
      limitation_note:
        'Daily CHIRPS values are disaggregated from pentads; compare with INSIVUMEH ground station and GPM IMERG for single-day extremes.',
    },
  },
];

export const STUB_ENSO: Schemas['EnsoSeriesResponse'] = {
  threshold_c: 0.5,
  items: [
    {
      month: '2023-11',
      oni_c: 1.9,
      roni_c: 1.7,
      phase: 'el_nino',
      rainfall_anomaly_note: 'Strong El Nino; delayed rainy onset and extended canicula risk.',
    },
    {
      month: '2025-05',
      oni_c: -0.5,
      roni_c: -0.6,
      phase: 'la_nina',
      rainfall_anomaly_note: 'Early Primera rainfall above average near Guatemala City.',
    },
  ],
  provenance: STUB_PROVENANCE,
  disclaimer: DISCLAIMER_TEXT,
};

export const STUB_SIMULATION: Schemas['ScenarioSimulationResponse'] = {
  farm_id: 'farm_insivumeh_001',
  crop_id: 'maize',
  metric_name: 'projected_grain_yield',
  baseline: {
    p10: 2450,
    p50: 3100,
    p90: 3650,
    unit: 'kg/ha',
    confidence_note: '10th-90th percentile interval from whole-year cross-validation.',
  },
  scenario: {
    p10: 1950,
    p50: 2680,
    p90: 3290,
    unit: 'kg/ha',
    confidence_note: 'Wider lower tail due to simulated mid-season moisture deficit.',
  },
  out_of_training_range: false,
  range_warning: null,
  top_attributions: [
    {
      feature: 'july_august_rainfall_anomaly_pct',
      shap_value: -240.5,
      direction: 'negative',
      explanation: 'Simulated rainfall reduction during flowering (Canicula) lowers median yield.',
    },
  ],
  timeline: [
    {
      period: '2025-05',
      baseline_p50: 520,
      scenario_p10: 410,
      scenario_p50: 480,
      scenario_p90: 560,
      water_balance_mm: 42,
    },
  ],
  provenance: STUB_PROVENANCE,
  disclaimer: DISCLAIMER_TEXT,
};

export const STUB_RECOMMENDATION: Schemas['Recommendation'] = {
  id: 'rec_gt_001',
  farm_id: 'farm_insivumeh_001',
  scenario_summary:
    'Comparison for Guatemala City highlands (1,502 m, ~1,280 mm annual rain, 93% May-October) under neutral-to-La Nina transition.',
  strategies: [
    {
      id: 'strat_current_monocrop_maize',
      name: 'Current Rotation: Continuous Rainfed Maize + Dry-Season Fallow',
      is_current_rotation: true,
      sequence: ['maize (May-Oct)', 'bare fallow (Nov-Apr)'],
      why: ['Included as the baseline rotation currently practiced on the parcel.'],
      evidence: [
        'INSIVUMEH 1995-2025 series shows 93% of annual rainfall (1,280 mm) falls May-October.',
      ],
      benefits: ['Single-crop management with familiar sowing dates at the onset of May rains.'],
      gaps: ['No parcel-level laboratory soil nitrogen or pH analysis has been uploaded.'],
      risks: ['High vulnerability to July-August Canicula dry spells during silking.'],
      needs_local_review: true,
      uncertainty: {
        p10: 2100,
        p50: 2950,
        p90: 3550,
        unit: 'kg/ha maize equivalent',
        confidence_note: 'Wide downside tail in years with prolonged Canicula.',
      },
      scores: {
        overall: 58,
        yield_stability: 55,
        soil_health: 42,
        water_efficiency: 54,
        income_diversification: 40,
        low_input_cost: 82,
      },
    },
    {
      id: 'strat_maize_black_bean_relay',
      name: 'Maize (Primera) + Bush Black Bean Relay (Postrera) + Mulch Retention',
      is_current_rotation: false,
      sequence: ['maize (May-Sep)', 'black_bean relay (Aug-Nov)', 'crop residue mulch (Dec-Apr)'],
      why: ['Aligns with farmer priorities for yield stability and soil health.'],
      evidence: [
        'FAO ECOCROP and GAEZ v5 show high suitability for Phaseolus vulgaris at 1,500 m.',
      ],
      benefits: ['Symbiotic nitrogen fixation reduces synthetic fertilizer demand.'],
      gaps: [
        'Exact field drainage capacity and slope gradient at sub-parcel scale are not verified.',
      ],
      risks: ['Under strong La Nina years, black beans face fungal web blight risk.'],
      needs_local_review: true,
      uncertainty: {
        p10: 2650,
        p50: 3420,
        p90: 4050,
        unit: 'kg/ha maize-equivalent system output',
        confidence_note: 'Higher median and 10th percentile due to risk spreading.',
      },
      scores: {
        overall: 82,
        yield_stability: 84,
        soil_health: 83,
        water_efficiency: 80,
        income_diversification: 85,
        low_input_cost: 74,
      },
    },
    {
      id: 'strat_maize_fava_canavalia_cover',
      name: 'Maize-Legume Intercrop + Drought-Tolerant Green Manure Cover (Canavalia)',
      is_current_rotation: false,
      sequence: [
        'maize + climbing bean intercrop (May-Oct)',
        'canavalia ensiformis cover crop (Oct-Mar)',
      ],
      why: [
        'Maximizes soil organic carbon restoration and eliminates dry-season bare-field window.',
      ],
      evidence: [
        'MODIS/Sentinel-2 bare-field analysis flags Jan-Apr as main soil exposure period.',
      ],
      benefits: ['High biomass cover suppresses weeds and buffers soil temperature.'],
      gaps: ['Local seed availability and cost for Canavalia ensiformis are not in the dataset.'],
      risks: ['Cover crop produces no direct cash harvest in the dry season.'],
      needs_local_review: true,
      uncertainty: {
        p10: 2500,
        p50: 3280,
        p90: 3920,
        unit: 'kg/ha maize-equivalent system output',
        confidence_note: 'Soil moisture conservation benefits compound in year 2+.',
      },
      scores: {
        overall: 77,
        yield_stability: 79,
        soil_health: 92,
        water_efficiency: 85,
        income_diversification: 64,
        low_input_cost: 62,
      },
    },
  ],
  provenance: STUB_PROVENANCE,
  disclaimer: DISCLAIMER_TEXT,
};

export const handlers = [
  http.get('*/healthz', () => {
    const body: Schemas['HealthStatus'] = { status: 'ok' };
    return HttpResponse.json(body, { headers: STUB_HEADERS });
  }),

  http.get('*/v1/me', () => {
    return HttpResponse.json<Schemas['UserProfile']>(STUB_USER, { headers: STUB_HEADERS });
  }),

  http.get('*/v1/farms', () => {
    const body: Schemas['FarmListResponse'] = {
      items: STUB_FARMS,
      pagination: { limit: 20, next_cursor: null },
    };
    return HttpResponse.json(body, { headers: STUB_HEADERS });
  }),

  http.get('*/v1/layers', () => {
    const body: Schemas['LayerListResponse'] = {
      items: STUB_LAYERS,
      pagination: { limit: 20, next_cursor: null },
    };
    return HttpResponse.json(body, { headers: STUB_HEADERS });
  }),

  http.get('*/v1/climate/enso', () => {
    return HttpResponse.json<Schemas['EnsoSeriesResponse']>(STUB_ENSO, { headers: STUB_HEADERS });
  }),

  http.post('*/v1/scenarios/simulate', async ({ request }) => {
    const payload = (await request.json()) as Schemas['ScenarioSimulationRequest'];
    const body: Schemas['ScenarioSimulationResponse'] = {
      ...STUB_SIMULATION,
      farm_id: payload.farm_id,
      crop_id: payload.crop_id,
    };
    return HttpResponse.json(body, { headers: STUB_HEADERS });
  }),

  http.post('*/v1/farms/:id/recommendations', ({ params }) => {
    const farmId = String(params.id ?? 'farm_insivumeh_001');
    const body: Schemas['Recommendation'] = {
      ...STUB_RECOMMENDATION,
      farm_id: farmId,
    };
    return HttpResponse.json(body, { headers: STUB_HEADERS });
  }),

  http.get('*/v1/search', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? '';
    const body: Schemas['SearchResponse'] = {
      query: q,
      items: [
        {
          id: 'crop_maize',
          type: 'crop',
          name: 'Maize (Zea mays)',
          aliases: ['maiz', 'corn', 'milpa'],
          similarity: 0.92,
          summary: 'Primary staple cereal in Guatemala; rainfed Primera sowing in May.',
        },
      ],
      pagination: { limit: 20, next_cursor: null },
    };
    return HttpResponse.json(body, { headers: STUB_HEADERS });
  }),
];
