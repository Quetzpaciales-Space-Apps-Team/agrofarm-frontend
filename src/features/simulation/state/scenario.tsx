import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SCENARIO, type ScenarioValues } from '../../../domain/scenario';
import { useDebouncedValue } from '../../../services/useDebouncedValue';

export interface ScenarioState extends ScenarioValues {
  /** `null` until the farm is loaded and the first crop is chosen. */
  crop: string | null;
}

interface ScenarioContextValue {
  /** What the controls show right now. */
  scenario: ScenarioState;
  /** The same values after a pause: this is what drives API calls. */
  debounced: ScenarioState;
  update: (change: Partial<ScenarioState>) => void;
  reset: () => void;
}

const INITIAL: ScenarioState = { ...DEFAULT_SCENARIO, crop: null };
const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({
  children,
  debounceMs = 400,
}: {
  children: ReactNode;
  debounceMs?: number;
}) {
  const [scenario, setScenario] = useState<ScenarioState>(INITIAL);
  const debounced = useDebouncedValue(scenario, debounceMs);
  const update = useCallback(
    (change: Partial<ScenarioState>) => setScenario((current) => ({ ...current, ...change })),
    [],
  );
  const reset = useCallback(
    () => setScenario((current) => ({ ...INITIAL, crop: current.crop })),
    [],
  );
  const value = useMemo(
    () => ({ scenario, debounced, update, reset }),
    [scenario, debounced, update, reset],
  );
  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
}

export function useScenario(): ScenarioContextValue {
  const value = useContext(ScenarioContext);
  if (!value) throw new Error('useScenario must be used inside <ScenarioProvider>.');
  return value;
}
