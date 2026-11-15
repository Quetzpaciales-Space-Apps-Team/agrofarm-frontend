import type { ApiClient } from '../infrastructure/api/client';
import type {
  DemoSession,
  EnsoSeries,
  Farm,
  NasaPowerSeries,
  RecommendationSet,
  ScenarioInput,
  SimulationResult,
} from './types';

export const startDemoSession = (client: ApiClient) => client.post<DemoSession>('/v1/auth/demo');

export const fetchFarm = (client: ApiClient, farmId: string, signal?: AbortSignal) =>
  client.get<Farm>(`/v1/farms/${encodeURIComponent(farmId)}`, { signal });

export const fetchNasaPower = (
  client: ApiClient,
  range: { start?: string; end?: string } = {},
  signal?: AbortSignal,
) => client.get<NasaPowerSeries>('/v1/climate/nasa-power', { query: range, signal });

export const fetchEnso = (
  client: ApiClient,
  range: { start?: string; end?: string } = {},
  signal?: AbortSignal,
) => client.get<EnsoSeries>('/v1/climate/enso', { query: range, signal });

export const simulateScenario = (
  client: ApiClient,
  request: { farmId: string; crop: string; scenario: ScenarioInput },
  signal?: AbortSignal,
) =>
  client.post<SimulationResult>('/v1/scenarios/simulate', {
    body: { farm_id: request.farmId, crop: request.crop, scenario: request.scenario },
    signal,
  });

export const fetchRecommendations = (
  client: ApiClient,
  farmId: string,
  scenario: ScenarioInput,
  signal?: AbortSignal,
) =>
  client.post<RecommendationSet>(`/v1/farms/${encodeURIComponent(farmId)}/recommendations`, {
    body: { scenario },
    signal,
  });
