import { useCallback } from 'react';
import { simulateScenario } from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import type { ScenarioInput } from '../../../services/types';
import { useAsyncResource } from '../../../services/useAsyncResource';

export function useSimulation(farmId: string, crop: string, scenario: ScenarioInput) {
  const { client } = useApi();
  const { rainfall_change_pct: rain, temperature_change_c: temp, enso_phase: enso } = scenario;
  const load = useCallback(
    (signal: AbortSignal) =>
      simulateScenario(
        client,
        {
          farmId,
          crop,
          scenario: { rainfall_change_pct: rain, temperature_change_c: temp, enso_phase: enso },
        },
        signal,
      ),
    [client, farmId, crop, rain, temp, enso],
  );
  return useAsyncResource(load);
}
