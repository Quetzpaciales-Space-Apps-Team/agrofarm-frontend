import { useCallback } from 'react';
import { fetchRecommendations } from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import type { ScenarioInput } from '../../../services/types';
import { useAsyncResource } from '../../../services/useAsyncResource';

/**
 * `revision` changes when the farm's priorities were saved. The server reads the saved
 * priorities, so a new revision only asks for a fresh comparison.
 */
export function useRecommendations(farmId: string, scenario: ScenarioInput, revision = 0) {
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
    // `revision` only forces a new request: the server reads the saved priorities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, farmId, rain, temp, enso, revision],
  );
  return useAsyncResource(load);
}
