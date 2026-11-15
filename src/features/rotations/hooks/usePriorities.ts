import { useCallback } from 'react';
import { fetchPriorities } from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import { useAsyncResource } from '../../../services/useAsyncResource';

export function usePriorities(farmId: string) {
  const { client } = useApi();
  const load = useCallback(
    (signal: AbortSignal) => fetchPriorities(client, farmId, signal),
    [client, farmId],
  );
  return useAsyncResource(load);
}
