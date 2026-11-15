// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { http } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { components } from '../infrastructure/api/schema';
import { DEMO_FARM_ID, problemResponse, resetStubState } from './handlers';
import { server } from './server';

type Schemas = components['schemas'];

const repoRoot = path.resolve(import.meta.dirname, '../..');
const BASE_URL = 'http://localhost:8000';
const AUTH = { Authorization: 'Bearer stub.access.token' };

async function call(pathname: string, init: RequestInit = {}, authenticated = true) {
  return fetch(`${BASE_URL}${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated ? AUTH : {}),
      ...init.headers,
    },
  });
}

async function simulate(scenario: Partial<Schemas['Scenario']>) {
  const res = await call('/v1/scenarios/simulate', {
    method: 'POST',
    body: JSON.stringify({ farm_id: DEMO_FARM_ID, crop: 'maize', scenario }),
  });
  return { res, body: (await res.json()) as Schemas['SimulationResult'] };
}

describe('Generated OpenAPI types (FE-006)', () => {
  it('keeps src/infrastructure/api/schema.d.ts in sync with docs/contract/openapi.yaml', () => {
    const schemaPath = path.join(repoRoot, 'src/infrastructure/api/schema.d.ts');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrofarm-openapi-'));
    const tmpSchemaPath = path.join(tmpDir, 'schema.d.ts');
    const cliPath = path.join(repoRoot, 'node_modules/.bin/openapi-typescript');

    execFileSync(
      cliPath,
      [path.join(repoRoot, 'docs/contract/openapi.yaml'), '-o', tmpSchemaPath],
      {
        cwd: repoRoot,
      },
    );

    const committed = fs.readFileSync(schemaPath, 'utf8');
    const regenerated = fs.readFileSync(tmpSchemaPath, 'utf8');
    fs.rmSync(tmpDir, { recursive: true, force: true });

    expect(committed).toBe(regenerated);
  });

  it('uses the core-api contract (farm_id path parameter, demo login)', () => {
    const yaml = fs.readFileSync(path.join(repoRoot, 'docs/contract/openapi.yaml'), 'utf8');
    expect(yaml).toContain('/v1/farms/{farm_id}');
    expect(yaml).toContain('/v1/auth/demo');
    expect(yaml).toContain('/v1/climate/nasa-power');
  });
});

describe('Typed MSW stub handlers (core-api contract)', () => {
  beforeAll(() => {
    server.listen();
  });
  beforeEach(() => {
    resetStubState();
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
  });

  describe('auth', () => {
    it('creates a demo guest session on POST /v1/auth/demo', async () => {
      const res = await call('/v1/auth/demo', { method: 'POST' }, false);
      expect(res.status).toBe(201);
      expect(res.headers.get('x-stub')).toBe('true');
      const body = (await res.json()) as Schemas['DemoAuthResponse'];
      expect(body.access_token).toBeTruthy();
      expect(body.token_type).toBe('bearer');
      expect(body.farm_id).toBe(DEMO_FARM_ID);
      expect(body.is_demo_guest).toBe(true);
    });

    it('serves the current user on GET /v1/me with the new field name', async () => {
      const res = await call('/v1/me');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Schemas['User'];
      expect(body.name).toBeTruthy();
      expect(body.role).toBe('farmer');
      expect(body).not.toHaveProperty('full_name');
    });

    it('answers 401 problem+json without a bearer token', async () => {
      const res = await call('/v1/me', {}, false);
      expect(res.status).toBe(401);
      expect(res.headers.get('content-type')).toContain('application/problem+json');
      const body = (await res.json()) as Schemas['Problem'];
      expect(body.status).toBe(401);
      expect(body.code).toBe('unauthorized');
      expect(body.request_id).toBeTruthy();
    });
  });

  describe('farms', () => {
    it('lists farms with boundary and area_ha on GET /v1/farms', async () => {
      const res = await call('/v1/farms');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Schemas['FarmList'];
      expect(body.next_cursor).toBeNull();
      expect(body.items[0].id).toBe(DEMO_FARM_ID);
      expect(body.items[0].boundary.type).toBe('Polygon');
      expect(body.items[0].area_ha).toBeGreaterThan(0);
      expect(body.items[0].current_rotation.length).toBeGreaterThan(0);
    });

    it('serves one farm on GET /v1/farms/{farm_id} and 404 for an unknown id', async () => {
      const ok = await call(`/v1/farms/${DEMO_FARM_ID}`);
      expect(ok.status).toBe(200);
      expect(((await ok.json()) as Schemas['Farm']).name).toContain('Pilot Farm');

      const missing = await call('/v1/farms/00000000-0000-4000-8000-000000000000');
      expect(missing.status).toBe(404);
      expect(((await missing.json()) as Schemas['Problem']).code).toBe('not_found');
    });

    it('answers 401 on farms without a token', async () => {
      expect((await call('/v1/farms', {}, false)).status).toBe(401);
    });
  });

  describe('climate', () => {
    it('serves the ENSO series with oni, roni and a source', async () => {
      const res = await call('/v1/climate/enso');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Schemas['EnsoSeries'];
      expect(body.threshold_c).toBe(0.5);
      expect(body.source).toBeTruthy();
      expect(body.disclaimer).toBeTruthy();
      const phases = new Set(body.items.map((item) => item.phase));
      expect(phases).toEqual(new Set(['el_nino', 'la_nina', 'neutral']));
      for (const item of body.items) {
        expect(item.month).toMatch(/^\d{4}-\d{2}$/);
        if (item.phase === 'el_nino') expect(item.oni).toBeGreaterThanOrEqual(0.5);
        if (item.phase === 'la_nina') expect(item.oni).toBeLessThanOrEqual(-0.5);
      }
    });

    it('honours start and end on the ENSO series', async () => {
      const res = await call('/v1/climate/enso?start=2024-01&end=2024-06');
      const body = (await res.json()) as Schemas['EnsoSeries'];
      expect(body.items.map((i) => i.month)).toEqual([
        '2024-01',
        '2024-02',
        '2024-03',
        '2024-04',
        '2024-05',
        '2024-06',
      ]);
    });

    it('serves NASA POWER monthly data with provenance and at least one null value', async () => {
      const res = await call('/v1/climate/nasa-power');
      expect(res.status).toBe(200);
      expect(res.headers.get('x-stub')).toBe('true');
      const body = (await res.json()) as Schemas['NasaPowerSeries'];
      expect(body.items.length).toBeGreaterThan(24);
      expect(body.attribution).toBeTruthy();
      expect(body.resolution_note).toBeTruthy();
      expect(body.disclaimer).toBeTruthy();
      expect(body.source).toBeTruthy();
      expect(body.items.some((item) => item.rainfall_mm === null)).toBe(true);
      expect(body.items.some((item) => item.temperature_mean_c === null)).toBe(true);
    });

    it('honours start and end on NASA POWER and returns an empty list outside the data', async () => {
      const res = await call('/v1/climate/nasa-power?start=2024-03&end=2024-05');
      const body = (await res.json()) as Schemas['NasaPowerSeries'];
      expect(body.items.map((i) => i.month)).toEqual(['2024-03', '2024-04', '2024-05']);

      const empty = await call('/v1/climate/nasa-power?start=2090-01&end=2090-12');
      expect(((await empty.json()) as Schemas['NasaPowerSeries']).items).toEqual([]);
    });

    it('rejects a malformed or reversed NASA POWER range with 422', async () => {
      expect((await call('/v1/climate/nasa-power?start=2024-13')).status).toBe(422);
      const reversed = await call('/v1/climate/nasa-power?start=2024-06&end=2024-01');
      expect(reversed.status).toBe(422);
      expect(((await reversed.json()) as Schemas['Problem']).code).toBe('validation_error');
    });
  });

  describe('scenarios', () => {
    it('applies the stub rule: rainfall, temperature and ENSO change the answer', async () => {
      const neutral = await simulate({
        rainfall_change_pct: 0,
        temperature_change_c: 0,
        enso_phase: 'neutral',
      });
      expect(neutral.body.baseline).toEqual({ p10: -12, p50: 0, p90: 11 });
      expect(neutral.body.scenario).toEqual({ p10: -12, p50: 0, p90: 11 });

      const dry = await simulate({
        rainfall_change_pct: -20,
        temperature_change_c: 1,
        enso_phase: 'el_nino',
      });
      // -20 * 0.45 - 1 * 2.5 - 4 = -15.5
      expect(dry.body.scenario.p50).toBeCloseTo(-15.5, 5);
      expect(dry.body.scenario.p10).toBeCloseTo(-27.5, 5);
      expect(dry.body.scenario.p90).toBeCloseTo(-4.5, 5);
      expect(dry.body.baseline).toEqual({ p10: -12, p50: 0, p90: 11 });
      expect(dry.body.target).toBe('yield_anomaly_pct');
      expect(dry.body.unit).toBe('%');

      const wet = await simulate({
        rainfall_change_pct: 20,
        temperature_change_c: 0,
        enso_phase: 'la_nina',
      });
      expect(wet.body.scenario.p50).toBeCloseTo(12, 5);
    });

    it('returns attributions sorted by absolute size and provenance marked as stub', async () => {
      const { body } = await simulate({
        rainfall_change_pct: -20,
        temperature_change_c: 1,
        enso_phase: 'el_nino',
      });
      const sizes = body.attributions.map((a) => Math.abs(a.contribution));
      expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
      expect(body.attributions[0].contribution).toBeCloseTo(-9, 5);
      expect(body.provenance.model_name).toContain('stub');
      expect(body.disclaimer).toBeTruthy();
    });

    it('lists out_of_range_inputs when rainfall beyond 60 % or temperature beyond 4 degrees C', async () => {
      const inside = await simulate({ rainfall_change_pct: 60, temperature_change_c: -4 });
      expect(inside.body.out_of_range_inputs).toEqual([]);

      const outside = await simulate({ rainfall_change_pct: -70, temperature_change_c: 5 });
      expect(outside.body.out_of_range_inputs).toEqual([
        'rainfall_change_pct',
        'temperature_change_c',
      ]);
    });

    it('answers 422 for values outside the contract and 404 for an unknown farm', async () => {
      const bad = await simulate({ rainfall_change_pct: -90 });
      expect(bad.res.status).toBe(422);

      const res = await call('/v1/scenarios/simulate', {
        method: 'POST',
        body: JSON.stringify({
          farm_id: '00000000-0000-4000-8000-000000000000',
          crop: 'maize',
          scenario: {},
        }),
      });
      expect(res.status).toBe(404);
    });

    it('answers 401 without a token', async () => {
      const res = await call('/v1/scenarios/simulate', { method: 'POST', body: '{}' }, false);
      expect(res.status).toBe(401);
    });
  });

  describe('recommendations and priorities', () => {
    async function recommend(scenario?: Partial<Schemas['Scenario']>) {
      const res = await call(`/v1/farms/${DEMO_FARM_ID}/recommendations`, {
        method: 'POST',
        body: JSON.stringify(scenario ? { scenario } : {}),
      });
      return { res, body: (await res.json()) as Schemas['RecommendationSet'] };
    }

    it('returns at least three strategies, exactly one current, with the five blocks', async () => {
      const { res, body } = await recommend({ rainfall_change_pct: -20, enso_phase: 'el_nino' });
      expect(res.status).toBe(201);
      expect(body.strategies.length).toBeGreaterThanOrEqual(3);
      expect(body.strategies.filter((s) => s.is_current)).toHaveLength(1);
      expect(body.disclaimer).toBeTruthy();
      for (const s of body.strategies) {
        expect(s.overall_score).toBeGreaterThanOrEqual(0);
        expect(s.overall_score).toBeLessThanOrEqual(1);
        expect(s.uncertainty.low).toBeLessThanOrEqual(s.overall_score);
        expect(s.uncertainty.high).toBeGreaterThanOrEqual(s.overall_score);
        expect(Object.keys(s.scores)).toHaveLength(7);
        for (const v of Object.values(s.scores)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
        expect(s.why.length).toBeGreaterThan(0);
        expect(s.evidence.length).toBeGreaterThan(0);
        expect(s.evidence[0].source).toBeTruthy();
        expect(s.benefits.length).toBeGreaterThan(0);
        expect(s.gaps.length).toBeGreaterThan(0);
        expect(s.risks.length).toBeGreaterThan(0);
        expect(typeof s.needs_local_review).toBe('boolean');
      }
    });

    it('lets the scenario and the priorities change the scores', async () => {
      const calm = await recommend({ rainfall_change_pct: 0, enso_phase: 'neutral' });
      const dry = await recommend({ rainfall_change_pct: -40, enso_phase: 'el_nino' });
      const scoreOf = (set: Schemas['RecommendationSet']) =>
        Object.fromEntries(set.strategies.map((s) => [s.id, s.scores.water_use]));
      expect(scoreOf(dry.body)).not.toEqual(scoreOf(calm.body));

      const before = await recommend();
      await call(`/v1/farms/${DEMO_FARM_ID}/priorities`, {
        method: 'PUT',
        body: JSON.stringify({
          weights: {
            water_use: 0,
            income: 1,
            soil_structure: 0,
            forage_value: 0,
            nitrogen_fixing: 0,
            erosion_reduction: 0,
            market_suitability: 0,
          },
          constraints: { water_availability: 'high', equipment: ['tractor'] },
        } satisfies Schemas['Priorities']),
      });
      const after = await recommend();
      expect(after.body.strategies.map((s) => s.overall_score)).not.toEqual(
        before.body.strategies.map((s) => s.overall_score),
      );
    });

    it('reads and replaces priorities on GET/PUT /v1/farms/{farm_id}/priorities', async () => {
      const get = await call(`/v1/farms/${DEMO_FARM_ID}/priorities`);
      expect(get.status).toBe(200);
      const current = (await get.json()) as Schemas['Priorities'];
      expect(Object.keys(current.weights)).toHaveLength(7);

      const next: Schemas['Priorities'] = {
        ...current,
        weights: { ...current.weights, income: 0.1 },
      };
      const put = await call(`/v1/farms/${DEMO_FARM_ID}/priorities`, {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      expect(put.status).toBe(200);
      const again = await call(`/v1/farms/${DEMO_FARM_ID}/priorities`);
      expect(((await again.json()) as Schemas['Priorities']).weights.income).toBe(0.1);

      const invalid = await call(`/v1/farms/${DEMO_FARM_ID}/priorities`, {
        method: 'PUT',
        body: JSON.stringify({ weights: { income: 3 } }),
      });
      expect(invalid.status).toBe(422);
    });

    it('answers 401 on recommendations and priorities without a token', async () => {
      expect(
        (await call(`/v1/farms/${DEMO_FARM_ID}/recommendations`, { method: 'POST' }, false)).status,
      ).toBe(401);
      expect((await call(`/v1/farms/${DEMO_FARM_ID}/priorities`, {}, false)).status).toBe(401);
    });
  });

  describe('error helpers', () => {
    it('problemResponse builds a stub problem+json for tests that need a 500, 503 or 429', async () => {
      server.use(
        http.get('*/v1/farms', () =>
          problemResponse(500, 'internal_error', 'Something went wrong on the server.'),
        ),
      );
      const res = await call('/v1/farms');
      expect(res.status).toBe(500);
      expect(res.headers.get('x-stub')).toBe('true');
      const body = (await res.json()) as Schemas['Problem'];
      expect(body).toMatchObject({ status: 500, code: 'internal_error' });
    });
  });
});
