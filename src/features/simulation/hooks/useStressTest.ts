import { useCallback, useEffect, useRef, useState } from 'react';
import { SCENARIO_PRESETS, type ScenarioPresetId } from '../../../domain/scenarioPresets';
import { STRESS_TEST_CROPS } from '../../../domain/stressTest';
import { simulateScenario } from '../../../services/api';
import { useApi } from '../../../services/ApiContext';
import type { SimulationResult } from '../../../services/types';

export interface StressTestEntry {
  crop: string;
  presetId: ScenarioPresetId;
  result: SimulationResult;
}

export type StressTestStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'error';

const MAX_CONCURRENCY = 2;

export function useStressTest(farmId: string) {
  const { client } = useApi();
  const cacheRef = useRef<Map<string, SimulationResult>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const [status, setStatus] = useState<StressTestStatus>('idle');
  const [completed, setCompleted] = useState(0);
  const [entries, setEntries] = useState<StressTestEntry[]>([]);
  const [error, setError] = useState<unknown>(null);

  const total = STRESS_TEST_CROPS.length * SCENARIO_PRESETS.length;

  useEffect(() => () => abortRef.current?.abort(), []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('cancelled');
  }, []);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('running');
    setError(null);

    const tasks: { crop: string; presetId: ScenarioPresetId; key: string }[] = [];
    for (const crop of STRESS_TEST_CROPS) {
      for (const preset of SCENARIO_PRESETS) {
        tasks.push({ crop, presetId: preset.id, key: `${farmId}:${crop}:${preset.id}` });
      }
    }

    const results = new Map<string, StressTestEntry>();
    let doneCount = 0;

    const pending: typeof tasks = [];
    for (const task of tasks) {
      const cached = cacheRef.current.get(task.key);
      if (cached) {
        results.set(task.key, { crop: task.crop, presetId: task.presetId, result: cached });
        doneCount += 1;
      } else {
        pending.push(task);
      }
    }

    setCompleted(doneCount);
    setEntries(Array.from(results.values()));

    if (pending.length === 0) {
      setStatus('done');
      return;
    }

    let cursor = 0;
    let failed = false;

    async function worker() {
      while (!controller.signal.aborted && !failed) {
        const index = cursor;
        cursor += 1;
        if (index >= pending.length) return;
        const task = pending[index];
        const preset = SCENARIO_PRESETS.find((p) => p.id === task.presetId)!;
        try {
          const data = await simulateScenario(
            client,
            { farmId, crop: task.crop, scenario: preset.values },
            controller.signal,
          );
          if (controller.signal.aborted) return;
          cacheRef.current.set(task.key, data);
          results.set(task.key, { crop: task.crop, presetId: task.presetId, result: data });
          doneCount += 1;
          setCompleted(doneCount);
          setEntries(Array.from(results.values()));
        } catch (err) {
          if (controller.signal.aborted) return;
          failed = true;
          controller.abort();
          setError(err);
          setStatus('error');
          return;
        }
      }
    }

    const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, pending.length) }, () =>
      worker(),
    );
    await Promise.all(workers);

    if (!controller.signal.aborted && !failed) {
      setStatus('done');
    }
  }, [client, farmId]);

  return { status, completed, total, entries, error, run, cancel };
}
