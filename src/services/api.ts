import type { ApiClient } from '../infrastructure/api/client';
import { encodeMultipartFile } from '../infrastructure/api/multipart';
import type {
  DemoSession,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
  EnsoSeries,
  Farm,
  NasaPowerSeries,
  RecommendationSet,
  ScenarioInput,
  SimulationResult,
  UploadResult,
} from './types';

export const startDemoSession = (client: ApiClient) => client.post<DemoSession>('/v1/auth/demo');

export const registerAccount = (client: ApiClient, body: RegisterRequest) =>
  client.post<User>('/v1/auth/register', { body });

export const loginAccount = (client: ApiClient, body: LoginRequest) =>
  client.post<TokenResponse>('/v1/auth/login', { body });

export const logoutAccount = (client: ApiClient) => client.post<void>('/v1/auth/logout');

export const fetchMe = (client: ApiClient, signal?: AbortSignal) =>
  client.get<User>('/v1/me', { signal });

export const fetchFarmIds = async (client: ApiClient, signal?: AbortSignal) =>
  (await client.get<{ items: Farm[] }>('/v1/farms', { signal })).items.map((farm) => farm.id);

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

/** `POST /v1/farms/{farm_id}/uploads`: one CSV or GeoJSON file, validated again by the server. */
export async function createUpload(
  client: ApiClient,
  farmId: string,
  file: File,
  options: { idempotencyKey?: string; signal?: AbortSignal } = {},
) {
  const { body, contentType } = await encodeMultipartFile('file', file);
  return client.post<UploadResult>(`/v1/farms/${encodeURIComponent(farmId)}/uploads`, {
    rawBody: body.buffer,
    contentType,
    headers: options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : undefined,
    signal: options.signal,
  });
}
