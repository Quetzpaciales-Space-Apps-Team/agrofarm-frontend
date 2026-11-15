import type { ApiClient } from '../infrastructure/api/client';
import type { ScenarioInput } from './types';

type Quantiles = { p10: number; p50: number; p90: number };
export interface VegetationOutlook {
  target: 'seasonal_peak_ndvi_anomaly_pct';
  unit: '%';
  baseline: Quantiles;
  scenario: Quantiles;
  attributions: { feature: string; contribution: number }[];
  explained_median_delta: number;
  out_of_range_inputs: string[];
  reference_cell: { cell_id: string; distance_km: number; resolution_degrees: number };
  validation: {
    acceptance_rule_met: false;
    skill_improvement_pct: number;
    required_improvement_pct: number;
    annual_mean_correlation: number;
    interval_coverage: number;
    years: number;
  };
  limitations: string[];
  disclaimer: string;
  provenance: { model_version: string };
}
export const simulateVegetation = (
  client: ApiClient,
  farmId: string,
  scenario: ScenarioInput,
  signal: AbortSignal,
) =>
  client.post<VegetationOutlook>(`/v1/farms/${encodeURIComponent(farmId)}/vegetation/simulate`, {
    body: scenario,
    signal,
  });
