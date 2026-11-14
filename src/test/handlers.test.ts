// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { components } from '../infrastructure/api/schema';
import { server } from './server';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const BASE_URL = 'http://localhost:8000';

describe('Generated OpenAPI types and typed MSW handlers (FE-006)', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('keeps src/infrastructure/api/schema.d.ts in sync with docs/contract/openapi.yaml', () => {
    const schemaPath = path.join(repoRoot, 'src/infrastructure/api/schema.d.ts');
    expect(fs.existsSync(schemaPath)).toBe(true);

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

  it('serves typed user profile on GET /v1/me', async () => {
    const res = await fetch(`${BASE_URL}/v1/me`);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-stub')).toBe('true');

    const body = (await res.json()) as components['schemas']['UserProfile'];
    expect(body.id).toBe('usr_gt_001');
    expect(body.role).toBe('farmer');
  });

  it('serves typed farm list on GET /v1/farms', async () => {
    const res = await fetch(`${BASE_URL}/v1/farms`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as components['schemas']['FarmListResponse'];
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    expect(body.items[0].id).toBe('farm_insivumeh_001');
    expect(body.pagination.limit).toBe(20);
  });

  it('serves typed map layers on GET /v1/layers', async () => {
    const res = await fetch(`${BASE_URL}/v1/layers`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as components['schemas']['LayerListResponse'];
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    expect(body.items[0].legend.color_blind_safe).toBe(true);
    expect(body.items[0].source.dataset_id).toBeTruthy();
  });

  it('serves typed ENSO series on GET /v1/climate/enso', async () => {
    const res = await fetch(`${BASE_URL}/v1/climate/enso`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as components['schemas']['EnsoSeriesResponse'];
    expect(body.threshold_c).toBe(0.5);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.provenance.model_name).toBeTruthy();
  });

  it('serves typed scenario simulation with quantile uncertainty on POST /v1/scenarios/simulate', async () => {
    const payload: components['schemas']['ScenarioSimulationRequest'] = {
      farm_id: 'farm_insivumeh_001',
      crop_id: 'maize',
      season_start: '2025-05-01',
      season_end: '2025-10-31',
      rainfall_change_pct: -15,
      temperature_change_c: 1.5,
      enso_phase: 'el_nino',
    };

    const res = await fetch(`${BASE_URL}/v1/scenarios/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as components['schemas']['ScenarioSimulationResponse'];
    expect(body.baseline.p10).toBeLessThanOrEqual(body.baseline.p50);
    expect(body.baseline.p50).toBeLessThanOrEqual(body.baseline.p90);
    expect(body.scenario.p10).toBeLessThanOrEqual(body.scenario.p50);
    expect(body.scenario.p50).toBeLessThanOrEqual(body.scenario.p90);
    expect(body.disclaimer).toBeTruthy();
  });

  it('serves typed rotation recommendations with >=3 strategies and rule G10 fields on POST /v1/farms/{id}/recommendations', async () => {
    const res = await fetch(`${BASE_URL}/v1/farms/farm_insivumeh_001/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enso_phase: 'la_nina',
        rainfall_change_pct: 0,
        temperature_change_c: 0,
      }),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as components['schemas']['Recommendation'];
    expect(body.strategies.length).toBeGreaterThanOrEqual(3);
    expect(body.strategies.some((s) => s.is_current_rotation)).toBe(true);
    for (const strategy of body.strategies) {
      expect(strategy.why.length).toBeGreaterThan(0);
      expect(strategy.evidence.length).toBeGreaterThan(0);
      expect(strategy.benefits.length).toBeGreaterThan(0);
      expect(strategy.gaps.length).toBeGreaterThan(0);
      expect(strategy.risks.length).toBeGreaterThan(0);
      expect(strategy.needs_local_review).toBe(true);
    }
    expect(body.disclaimer).toBeTruthy();
  });

  it('serves typed search results on GET /v1/search', async () => {
    const res = await fetch(`${BASE_URL}/v1/search?q=maize`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as components['schemas']['SearchResponse'];
    expect(body.query).toBe('maize');
    expect(body.items.length).toBeGreaterThan(0);
  });
});
