import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { ClimatePanel } from '../features/climate/components/ClimatePanel';
import { FarmDashboard } from '../features/farms/components/FarmDashboard';
import { LeafAssessmentPanel } from '../features/leaves/components/LeafAssessmentPanel';
import { RotationsSection } from '../features/rotations/components/RotationsSection';
import { VegetationPanel } from '../features/vegetation/components/VegetationPanel';
import { ScenarioPanel } from '../features/simulation/components/ScenarioPanel';
import { ScenarioProvider, useScenario } from '../features/simulation/state/scenario';

function Sections({ farmId }: { farmId: string }) {
  const { debounced } = useScenario();
  return (
    <>
      <FarmDashboard farmId={farmId} />
      <LeafAssessmentPanel key={farmId} farmId={farmId} />
      <ScenarioPanel farmId={farmId} />
      <VegetationPanel key={`vegetation-${farmId}`} farmId={farmId} scenario={debounced} />
      <RotationsSection
        farmId={farmId}
        scenario={{
          rainfall_change_pct: debounced.rainfall_change_pct,
          temperature_change_c: debounced.temperature_change_c,
          enso_phase: debounced.enso_phase,
        }}
      />
      <ClimatePanel />
    </>
  );
}

export function DashboardPage({ farmId, onLeave }: { farmId: string; onLeave: () => void }) {
  const { t } = useTranslation();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="stack">
      <div className="toolbar">
        <h2 ref={headingRef} tabIndex={-1}>
          {t('dashboard.title')}
        </h2>
        <button type="button" className="button button--secondary" onClick={onLeave}>
          {t('dashboard.leave')}
        </button>
      </div>
      <ScenarioProvider>
        <Sections farmId={farmId} />
      </ScenarioProvider>
    </div>
  );
}
