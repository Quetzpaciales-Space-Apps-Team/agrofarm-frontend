import { useCallback } from 'react';
import { fetchFarm } from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import { useAsyncResource } from '../../../services/useAsyncResource';

export function useFarm(farmId: string) {
  const { client } = useApi();
  const load = useCallback(
    (signal: AbortSignal) => fetchFarm(client, farmId, signal),
    [client, farmId],
  );
  return useAsyncResource(load);
}
