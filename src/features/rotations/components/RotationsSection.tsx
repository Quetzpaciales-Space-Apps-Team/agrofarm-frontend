import { useCallback, useState } from 'react';
import type { ScenarioInput } from '../../../services/types';
import { PrioritiesForm } from './PrioritiesForm';
import { RotationComparison } from './RotationComparison';

/** Priorities form plus the comparison. Saving priorities refreshes the comparison. */
export function RotationsSection({
  farmId,
  scenario,
}: {
  farmId: string;
  scenario: ScenarioInput;
}) {
  const [revision, setRevision] = useState(0);
  const onSaved = useCallback(() => setRevision((n) => n + 1), []);
  return (
    <>
      <PrioritiesForm farmId={farmId} onSaved={onSaved} />
      <RotationComparison farmId={farmId} scenario={scenario} revision={revision} />
    </>
  );
}
