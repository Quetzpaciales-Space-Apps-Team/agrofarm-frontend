import { http, HttpResponse } from 'msw';
import type { components } from '../infrastructure/api/schema';

type Schemas = components['schemas'];
// openapi-typescript marks fields with a schema default as required, but clients may omit them.
type Scenario = Partial<Schemas['Scenario']>;
type Weights = Schemas['PriorityWeights'];

/**
 * Typed MSW handlers for the core-api contract (docs/contract/openapi.yaml).
 * Every response carries `X-Stub: true`: the numbers are fixtures, not model output.
 */
const STUB_HEADERS = { 'X-Stub': 'true' };

export const DEMO_FARM_ID = '22222222-2222-4222-8222-222222222222';
export const DEMO_ACCESS_TOKEN = 'stub.access.token';
export const DISCLAIMER_TEXT =
  'This tool supports decisions. It does not replace farmers or local agronomists.';

const WEIGHT_KEYS = [
  'water_use',
  'income',
  'soil_structure',
  'forage_value',
  'nitrogen_fixing',
  'erosion_reduction',
  'market_suitability',
] as const;

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

let requestCounter = 0;

export function problemResponse(
  status: number,
  code: string,
  detail: string,
  errors?: Schemas['Problem']['errors'],
) {
  requestCounter += 1;
  const body: Schemas['Problem'] = {
    type: `https://agrofarm.example/problems/${code}`,
    title: detail,
    status,
    code,
    detail,
    request_id: `req-msw-${String(requestCounter).padStart(4, '0')}`,
    ...(errors ? { errors } : {}),
  };
  return new HttpResponse(JSON.stringify(body), {
    status,
    headers: { ...STUB_HEADERS, 'Content-Type': 'application/problem+json' },
  });
}

const unauthorized = () => problemResponse(401, 'unauthorized', 'Missing or invalid access token.');

function isAuthorized(request: Request) {
  return (request.headers.get('Authorization') ?? '').startsWith('Bearer ');
}

const ok = <T extends object>(body: T, status = 200) =>
  HttpResponse.json(body, { status, headers: STUB_HEADERS });

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const STUB_USER: Schemas['User'] = {
  id: '5b1c4b9e-77a0-4d7d-9d4f-3f0c2a9a1e55',
  email: 'demo-guest-5b1c4b9e@demo.agrofarm.invalid',
  name: 'Demo guest',
  role: 'farmer',
  created_at: '2026-11-14T15:00:00Z',
};

export const STUB_FARM: Schemas['Farm'] = {
  id: DEMO_FARM_ID,
  name: 'Guatemala Pilot Farm (Provisional)',
  boundary: {
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
  },
  area_ha: 119.4,
  current_rotation: ['maize', 'fallow'],
  created_at: '2026-11-14T15:05:00Z',
};

export const DEFAULT_PRIORITIES: Schemas['Priorities'] = {
  weights: {
    water_use: 0.9,
    income: 0.7,
    soil_structure: 0.5,
    forage_value: 0.1,
    nitrogen_fixing: 0.6,
    erosion_reduction: 0.8,
    market_suitability: 0.4,
  },
  constraints: { water_availability: 'low', equipment: ['hand_tools', 'animal_traction'] },
};

const STUB_PROVENANCE = (): Schemas['Provenance'] => ({
  model_name: 'agrofarm-stub',
  model_version: 'stub-0.1.0',
  data_versions: { insivumeh_daily: '2026-11-14', enso_monthly: '2026-11' },
  input_hash: '0'.repeat(64),
  generated_at: '2026-11-14T15:20:00Z',
});

let priorities: Schemas['Priorities'] = structuredClone(DEFAULT_PRIORITIES);

// ---- Auth stub state ------------------------------------------------------
// MSW cannot set a real httpOnly cookie, so `refreshCookie` stands for "the browser holds a
// valid refresh cookie". Login and demo set it, logout clears it, refresh needs it.
// All values below are fake and exist only for tests.

export const LOGIN_ACCESS_TOKEN = 'stub.login.token';
export const REFRESHED_ACCESS_TOKEN = 'stub.refreshed.token';
export const TEST_LOGIN = { email: 'farmer@example.test', password: 'fake-test-pass-01' };
export const TAKEN_EMAIL = 'taken@example.test';
export const STUB_ACCOUNT: Schemas['User'] = {
  id: '9c2f6a1e-3d4b-4e0a-8f55-1a2b3c4d5e6f',
  email: TEST_LOGIN.email,
  name: 'Test Farmer',
  role: 'farmer',
  created_at: '2026-11-14T15:00:00Z',
};

type StubSessionKind = 'demo' | 'user';
let stubSession: { cookie: boolean; kind: StubSessionKind } = { cookie: false, kind: 'demo' };

/** Pretends the browser holds (or not) a valid refresh cookie, as after a login or a reload. */
export function setRefreshCookie(cookie: boolean, kind: StubSessionKind = 'user') {
  stubSession = { cookie, kind };
}

/** Restores in-memory state changed by PUT handlers. Call it in `beforeEach`. */
export function resetStubState() {
  priorities = structuredClone(DEFAULT_PRIORITIES);
  requestCounter = 0;
  stubSession = { cookie: false, kind: 'demo' };
}

const utf8Length = (value: string) => new TextEncoder().encode(value).length;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- Months ---------------------------------------------------------------

function monthsBetween(startYear: number, endYear: number): string[] {
  const months: string[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      months.push(`${year}-${String(month).padStart(2, '0')}`);
    }
  }
  return months;
}

const ALL_MONTHS = monthsBetween(1995, 2025);

function filterMonths<T extends { month: string }>(items: T[], start?: string, end?: string): T[] {
  return items.filter(
    (item) =>
      (!start || item.month >= start.slice(0, 7)) && (!end || item.month <= end.slice(0, 7)),
  );
}

// ---- NASA POWER fixture ---------------------------------------------------

const RAINFALL_BY_MONTH = [8, 5, 12, 45, 170, 290, 215, 225, 300, 215, 40, 12];
const TEMP_BY_MONTH = [20.5, 21.4, 22.6, 23.2, 23.1, 22.4, 22.2, 22.3, 21.9, 21.5, 20.9, 20.2];

/** Months where the grid cell has no value. They are `null`, never 0. */
const NASA_GAP_MONTHS = new Set(['2023-09', '2024-02']);
const NASA_RAIN_ONLY_GAP_MONTHS = new Set(['2025-04']);

const NASA_ITEMS: Schemas['NasaPowerSeries']['items'] = ALL_MONTHS.map((month, index) => {
  const monthIndex = Number(month.slice(5)) - 1;
  const wobble = Math.sin(index * 1.7);
  const mean = TEMP_BY_MONTH[monthIndex] + wobble * 0.6;
  const wholeGap = NASA_GAP_MONTHS.has(month);
  const rainGap = wholeGap || NASA_RAIN_ONLY_GAP_MONTHS.has(month);
  const value = (v: number) => (wholeGap ? null : round2(v));
  return {
    month,
    rainfall_mm: rainGap
      ? null
      : round2(Math.max(0, RAINFALL_BY_MONTH[monthIndex] * (1 + wobble * 0.3))),
    temperature_mean_c: value(mean),
    temperature_min_c: value(mean - 6.2),
    temperature_max_c: value(mean + 6.8),
    relative_humidity_pct: value(55 + (RAINFALL_BY_MONTH[monthIndex] / 300) * 30),
    solar_radiation_mj_m2: value(20 - (RAINFALL_BY_MONTH[monthIndex] / 300) * 4),
    wind_speed_kmh: value(8 + wobble * 0.5),
  };
});

// ---- ENSO fixture ---------------------------------------------------------

/** Simplified ONI episodes (peak value and month range). Everything else is neutral. */
const ENSO_EPISODES: { from: string; to: string; peak: number }[] = [
  { from: '1997-05', to: '1998-05', peak: 2.4 },
  { from: '1998-08', to: '2001-02', peak: -1.5 },
  { from: '2009-07', to: '2010-04', peak: 1.4 },
  { from: '2010-07', to: '2011-04', peak: -1.6 },
  { from: '2015-03', to: '2016-05', peak: 2.6 },
  { from: '2020-08', to: '2021-05', peak: -1.2 },
  { from: '2021-07', to: '2023-02', peak: -1.0 },
  { from: '2023-06', to: '2024-04', peak: 2.0 },
  { from: '2024-10', to: '2025-03', peak: -0.7 },
];

const ENSO_ITEMS: Schemas['EnsoSeries']['items'] = ALL_MONTHS.map((month, index) => {
  const episode = ENSO_EPISODES.find((e) => month >= e.from && month <= e.to);
  let oni: number;
  if (episode) {
    const span = ALL_MONTHS.indexOf(episode.to) - ALL_MONTHS.indexOf(episode.from) || 1;
    const position = (index - ALL_MONTHS.indexOf(episode.from)) / span;
    const shape = Math.max(0.55, Math.sin(Math.PI * position));
    oni = round1(Math.sign(episode.peak) * Math.max(0.5, Math.abs(episode.peak) * shape));
  } else {
    oni = round1(Math.sin(index * 0.9) * 0.3);
  }
  const phase: Schemas['EnsoPhase'] = oni >= 0.5 ? 'el_nino' : oni <= -0.5 ? 'la_nina' : 'neutral';
  return { month, oni, roni: round1(oni - 0.3), phase };
});

// ---- Simulation rule ------------------------------------------------------

const ENSO_EFFECT: Record<Schemas['EnsoPhase'], number> = { el_nino: -4, la_nina: 3, neutral: 0 };

export function simulateStub(scenario: Scenario): Omit<Schemas['SimulationResult'], 'crop'> {
  const rain = scenario.rainfall_change_pct ?? 0;
  const temp = scenario.temperature_change_c ?? 0;
  const enso = ENSO_EFFECT[scenario.enso_phase ?? 'neutral'];

  const attributions = [
    { feature: 'rainfall_anomaly_jja', contribution: round1(rain * 0.45) },
    { feature: 'temperature_anomaly_jja', contribution: round1(-temp * 2.5) },
    { feature: 'enso_roni_lag3', contribution: enso },
  ].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const p50 = round1(rain * 0.45 - temp * 2.5 + enso);
  const outOfRange: string[] = [];
  if (Math.abs(rain) > 60) outOfRange.push('rainfall_change_pct');
  if (Math.abs(temp) > 4) outOfRange.push('temperature_change_c');

  return {
    target: 'yield_anomaly_pct',
    unit: '%',
    baseline: { p10: -12, p50: 0, p90: 11 },
    scenario: { p10: round1(-12 + p50), p50, p90: round1(11 + p50) },
    attributions,
    out_of_range_inputs: outOfRange,
    provenance: STUB_PROVENANCE(),
    disclaimer: DISCLAIMER_TEXT,
  };
}

// ---- Recommendation fixtures ----------------------------------------------

type StrategyFixture = Omit<Schemas['Strategy'], 'overall_score' | 'uncertainty'> & {
  /** How strongly the water_use score reacts to dry scenarios (0 to 1). */
  drySensitivity: number;
};

const STRATEGY_FIXTURES: StrategyFixture[] = [
  {
    id: 'current',
    name: 'Maize, then fallow',
    is_current: true,
    sequence: ['maize', 'fallow'],
    scores: {
      water_use: 0.5,
      income: 0.6,
      soil_structure: 0.3,
      forage_value: 0.1,
      nitrogen_fixing: 0.1,
      erosion_reduction: 0.3,
      market_suitability: 0.7,
    },
    drySensitivity: 0.5,
    why: ['This is what the farm does today. It is the baseline for the comparison.'],
    evidence: [
      {
        statement: 'About 93% of yearly rain falls from May to October at the reference station.',
        source: 'insivumeh_daily',
      },
    ],
    benefits: ['Known practice, no new equipment.'],
    gaps: ['No yield records uploaded for this farm.'],
    risks: [
      {
        description:
          'Bare soil from December to April raises erosion risk at the first heavy rains.',
        needs_local_review: true,
      },
    ],
    needs_local_review: true,
  },
  {
    id: 'maize_beans',
    name: 'Maize, then black beans',
    is_current: false,
    sequence: ['maize', 'black_beans'],
    scores: {
      water_use: 0.6,
      income: 0.7,
      soil_structure: 0.6,
      forage_value: 0.2,
      nitrogen_fixing: 0.9,
      erosion_reduction: 0.6,
      market_suitability: 0.7,
    },
    drySensitivity: 0.8,
    why: [
      'Beans fix nitrogen for the next maize crop.',
      'A second crop shortens the bare-field period.',
    ],
    evidence: [
      {
        statement: 'Legumes fix atmospheric nitrogen (crop traits table v1).',
        source: 'crop_traits',
      },
    ],
    benefits: ['Less nitrogen fertilizer needed.', 'Soil covered for more months.'],
    gaps: ['Late-season rainfall is uncertain under El Nino.', 'No local bean yield data.'],
    risks: [
      {
        description: 'Beans sown late may meet the dry season before filling pods.',
        needs_local_review: true,
      },
    ],
    needs_local_review: true,
  },
  {
    id: 'maize_cover_crop',
    name: 'Maize, then a cover crop',
    is_current: false,
    sequence: ['maize', 'cover_crop'],
    scores: {
      water_use: 0.7,
      income: 0.4,
      soil_structure: 0.8,
      forage_value: 0.6,
      nitrogen_fixing: 0.6,
      erosion_reduction: 0.9,
      market_suitability: 0.3,
    },
    drySensitivity: 0.3,
    why: [
      'Keeps the soil covered in the dry season.',
      'Matches the high weight given to erosion reduction.',
    ],
    evidence: [
      {
        statement: '90 days with 50 mm of rain or more were recorded from 1995 to 2025.',
        source: 'insivumeh_daily',
      },
    ],
    benefits: ['Lower erosion risk.', 'Better soil structure over several seasons.'],
    gaps: ['Seed availability and cost were not checked.'],
    risks: [{ description: 'The cover crop gives no direct income.', needs_local_review: true }],
    needs_local_review: true,
  },
];

function weightedScore(scores: Weights, weights: Weights): number {
  const total = WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0);
  if (total === 0)
    return WEIGHT_KEYS.reduce((sum, key) => sum + scores[key], 0) / WEIGHT_KEYS.length;
  return WEIGHT_KEYS.reduce((sum, key) => sum + scores[key] * weights[key], 0) / total;
}

export function recommendStub(scenario: Scenario | undefined): Schemas['Strategy'][] {
  const rain = scenario?.rainfall_change_pct ?? 0;
  const temp = scenario?.temperature_change_c ?? 0;
  const enso = scenario?.enso_phase ?? 'neutral';
  const dryness = Math.max(
    -0.5,
    Math.min(
      1,
      -rain / 100 + temp * 0.05 + (enso === 'el_nino' ? 0.2 : enso === 'la_nina' ? -0.1 : 0),
    ),
  );

  return STRATEGY_FIXTURES.map(({ drySensitivity, ...strategy }) => {
    const scores = {
      ...strategy.scores,
      water_use: round2(clamp01(strategy.scores.water_use - dryness * drySensitivity * 0.4)),
    };
    const overall = round2(clamp01(weightedScore(scores, priorities.weights)));
    return {
      ...strategy,
      scores,
      overall_score: overall,
      uncertainty: { low: round2(clamp01(overall - 0.1)), high: round2(clamp01(overall + 0.1)) },
    };
  });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isValidScenario(scenario: unknown): scenario is Scenario {
  if (typeof scenario !== 'object' || scenario === null) return false;
  const {
    rainfall_change_pct: rain,
    temperature_change_c: temp,
    enso_phase: enso,
  } = scenario as Scenario;
  const inRange = (v: unknown, min: number, max: number) =>
    v === undefined || (typeof v === 'number' && v >= min && v <= max);
  return (
    inRange(rain, -80, 100) &&
    inRange(temp, -5, 8) &&
    (enso === undefined || enso === 'el_nino' || enso === 'la_nina' || enso === 'neutral')
  );
}

function isValidPriorities(value: unknown): value is Schemas['Priorities'] {
  if (typeof value !== 'object' || value === null) return false;
  const { weights, constraints } = value as Partial<Schemas['Priorities']>;
  if (!weights || !constraints) return false;
  return (
    WEIGHT_KEYS.every(
      (key) => typeof weights[key] === 'number' && weights[key] >= 0 && weights[key] <= 1,
    ) &&
    ['low', 'medium', 'high'].includes(constraints.water_availability) &&
    Array.isArray(constraints.equipment)
  );
}

const farmNotFound = () => problemResponse(404, 'not_found', 'Farm not found.');

export const handlers = [
  http.get('*/healthz', () => ok({ status: 'ok' } satisfies Schemas['Health'])),

  http.post('*/v1/auth/demo', () => {
    setRefreshCookie(true, 'demo');
    return ok(
      {
        access_token: DEMO_ACCESS_TOKEN,
        token_type: 'bearer',
        expires_in: 900,
        farm_id: DEMO_FARM_ID,
        is_demo_guest: true,
      } satisfies Schemas['DemoAuthResponse'],
      201,
    );
  }),

  http.post('*/v1/auth/register', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<Schemas['RegisterRequest']>;
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name : '';
    const errors: NonNullable<Schemas['Problem']['errors']> = [];
    if (!EMAIL_SHAPE.test(email) || email.length > 254)
      errors.push({ field: 'email', message: 'Enter a valid email address.' });
    if (password.length < 10)
      errors.push({ field: 'password', message: 'Password must have at least 10 characters.' });
    else if (utf8Length(password) > 72)
      errors.push({ field: 'password', message: 'Password must have at most 72 bytes.' });
    if (name.length < 1 || name.length > 120)
      errors.push({ field: 'name', message: 'Name must have between 1 and 120 characters.' });
    if (errors.length > 0)
      return problemResponse(422, 'validation_error', 'The request body is not valid.', errors);
    if (email === TAKEN_EMAIL)
      return problemResponse(409, 'email_taken', 'This email cannot be used.');
    return ok({ ...STUB_ACCOUNT, email, name } satisfies Schemas['User'], 201);
  }),

  http.post('*/v1/auth/login', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<Schemas['LoginRequest']>;
    if (body.email !== TEST_LOGIN.email || body.password !== TEST_LOGIN.password) {
      return problemResponse(401, 'invalid_credentials', 'Invalid email or password.');
    }
    setRefreshCookie(true, 'user');
    return ok({
      access_token: LOGIN_ACCESS_TOKEN,
      token_type: 'bearer',
      expires_in: 900,
    } satisfies Schemas['TokenResponse']);
  }),

  http.post('*/v1/auth/refresh', () => {
    if (!stubSession.cookie)
      return problemResponse(401, 'unauthorized', 'No valid refresh cookie.');
    return ok({
      access_token: REFRESHED_ACCESS_TOKEN,
      token_type: 'bearer',
      expires_in: 900,
    } satisfies Schemas['TokenResponse']);
  }),

  http.post('*/v1/auth/logout', () => {
    stubSession = { ...stubSession, cookie: false };
    return new HttpResponse(null, { status: 204, headers: STUB_HEADERS });
  }),

  http.get('*/v1/me', ({ request }) =>
    isAuthorized(request)
      ? ok(stubSession.kind === 'user' ? STUB_ACCOUNT : STUB_USER)
      : unauthorized(),
  ),

  http.get('*/v1/farms', ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    return ok({ items: [STUB_FARM], next_cursor: null } satisfies Schemas['FarmList']);
  }),

  http.get('*/v1/farms/:farmId', ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    return params.farmId === DEMO_FARM_ID ? ok(STUB_FARM) : farmNotFound();
  }),

  http.get('*/v1/farms/:farmId/priorities', ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    return params.farmId === DEMO_FARM_ID ? ok(priorities) : farmNotFound();
  }),

  http.put('*/v1/farms/:farmId/priorities', async ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    if (params.farmId !== DEMO_FARM_ID) return farmNotFound();
    const payload: unknown = await request.json().catch(() => null);
    if (!isValidPriorities(payload)) {
      return problemResponse(422, 'validation_error', 'Priorities are not valid.', [
        { field: 'weights', message: 'Each weight must be a number from 0 to 1.' },
      ]);
    }
    priorities = payload;
    return ok(priorities);
  }),

  http.post('*/v1/farms/:farmId/recommendations', async ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    if (params.farmId !== DEMO_FARM_ID) return farmNotFound();
    const payload = (await request.json().catch(() => ({}))) as { scenario?: unknown } | null;
    const scenario = payload?.scenario;
    if (scenario !== undefined && !isValidScenario(scenario)) {
      return problemResponse(422, 'validation_error', 'Scenario is not valid.');
    }
    const body: Schemas['RecommendationSet'] = {
      id: '9d2b7c44-0f6e-4b0b-8a3f-7c1e5d9a6b21',
      farm_id: DEMO_FARM_ID,
      disclaimer: DISCLAIMER_TEXT,
      strategies: recommendStub(scenario),
      provenance: STUB_PROVENANCE(),
    };
    return ok(body, 201);
  }),

  http.get('*/v1/climate/enso', ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const url = new URL(request.url);
    const body: Schemas['EnsoSeries'] = {
      threshold_c: 0.5,
      items: filterMonths(
        ENSO_ITEMS,
        url.searchParams.get('start') ?? undefined,
        url.searchParams.get('end') ?? undefined,
      ),
      source: 'NOAA CPC',
      disclaimer: DISCLAIMER_TEXT,
    };
    return ok(body);
  }),

  http.get('*/v1/climate/nasa-power', ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const url = new URL(request.url);
    const start = url.searchParams.get('start') ?? undefined;
    const end = url.searchParams.get('end') ?? undefined;
    if ((start && !MONTH_PATTERN.test(start)) || (end && !MONTH_PATTERN.test(end))) {
      return problemResponse(422, 'validation_error', 'start and end must use the YYYY-MM format.');
    }
    if (start && end && start > end) {
      return problemResponse(422, 'validation_error', 'start must not be after end.');
    }
    const body: Schemas['NasaPowerSeries'] = {
      location: { latitude: 14.59, longitude: -90.53 },
      items: filterMonths(NASA_ITEMS, start, end),
      aggregation: {
        rainfall_mm: 'sum of daily values in the month (mm per month)',
        temperature_mean_c: 'mean of daily values',
        temperature_min_c: 'mean of the daily minimum',
        temperature_max_c: 'mean of the daily maximum',
        relative_humidity_pct: 'mean of daily values',
        solar_radiation_mj_m2: 'mean daily total (MJ/m2 per day)',
        wind_speed_kmh: 'mean of daily values',
      },
      source:
        'NASA POWER Daily API, community AG (MERRA-2 meteorology, CERES SYN1deg solar radiation)',
      source_url: 'https://power.larc.nasa.gov',
      attribution:
        'NASA Langley Research Center (LaRC) POWER Project, funded through the NASA Earth Science/Applied Science Program',
      resolution_note:
        'One point taken from a grid cell of about 0.5 x 0.625 degrees (about 50 km). It is a reanalysis, not a station measurement.',
      dataset_checksum_sha256: 'f3d67c4d22bcc20c753bb46598ba004e0a6487cffd41df520cc53db7b7e11456',
      processing_version: '0.1.0',
      disclaimer: DISCLAIMER_TEXT,
    };
    return ok(body);
  }),

  http.post('*/v1/scenarios/simulate', async ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const payload = (await request.json().catch(() => null)) as Partial<
      Schemas['SimulationRequest']
    > | null;
    if (!payload || typeof payload.crop !== 'string' || !isValidScenario(payload.scenario ?? {})) {
      return problemResponse(422, 'validation_error', 'Simulation request is not valid.');
    }
    if (payload.farm_id !== DEMO_FARM_ID) return farmNotFound();
    return ok({ crop: payload.crop, ...simulateStub(payload.scenario ?? {}) });
  }),
];
