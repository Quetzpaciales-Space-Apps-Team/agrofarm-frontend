import { useCallback } from 'react';
import { fetchEnso, fetchNasaPower } from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import { useAsyncResource } from '../../../services/useAsyncResource';

/**
 * Loads the full NASA POWER and ENSO series once. The range selector then slices them
 * in the browser, so changing the range never shows a loading state (about 370 months in total).
 */
export function useClimate() {
  const { client } = useApi();
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [nasa, enso] = await Promise.all([
        fetchNasaPower(client, {}, signal),
        fetchEnso(client, {}, signal),
      ]);
      return { nasa, enso };
    },
    [client],
  );
  return useAsyncResource(load);
}
