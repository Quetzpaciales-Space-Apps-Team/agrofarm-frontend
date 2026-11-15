import type { components } from '../infrastructure/api/schema';

/** Contract types for the layers above services (presentation may not import infrastructure). */
type Schemas = components['schemas'];

export type Farm = Schemas['Farm'];
export type NasaPowerSeries = Schemas['NasaPowerSeries'];
export type NasaPowerItem = NasaPowerSeries['items'][number];
export type EnsoSeries = Schemas['EnsoSeries'];
export type EnsoPhase = Schemas['EnsoPhase'];
export type DemoSession = Schemas['DemoAuthResponse'];
export type User = Schemas['User'];
export type TokenResponse = Schemas['TokenResponse'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type LoginRequest = Schemas['LoginRequest'];
export type SimulationResult = Schemas['SimulationResult'];
export type Provenance = Schemas['Provenance'];
export type RecommendationSet = Schemas['RecommendationSet'];
export type Strategy = Schemas['Strategy'];
export type ScenarioInput = {
  rainfall_change_pct: number;
  temperature_change_c: number;
  enso_phase: EnsoPhase;
};
export type UploadResult = Schemas['Upload'];
export type UploadRowError = Schemas['RowError'];
