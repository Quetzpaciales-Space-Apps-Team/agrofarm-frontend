import { useCallback } from 'react';
import { fetchRecommendations } from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import type { ScenarioInput } from '../../../services/types';
import { useAsyncResource } from '../../../services/useAsyncResource';

export function useRecommendations(farmId: string, scenario: ScenarioInput) {
  const { client } = useApi();
  const { rainfall_change_pct: rain, temperature_change_c: temp, enso_phase: enso } = scenario;
  const load = useCallback(
    (signal: AbortSignal) =>
      fetchRecommendations(
        client,
        farmId,
        { rainfall_change_pct: rain, temperature_change_c: temp, enso_phase: enso },
        signal,
      ),
    [client, farmId, rain, temp, enso],
  );
  return useAsyncResource(load);
}
