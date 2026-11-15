import type { ApiClient } from '../infrastructure/api/client';
import type { DemoSession, EnsoSeries, Farm, NasaPowerSeries } from './types';

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
