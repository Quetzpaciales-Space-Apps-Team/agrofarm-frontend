import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { ClimatePanel } from '../features/climate/components/ClimatePanel';
import { FarmDashboard } from '../features/farms/components/FarmDashboard';
import { UploadWizard } from '../features/uploads/components/UploadWizard';
import { LeafAssessmentPanel } from '../features/leaves/components/LeafAssessmentPanel';
import { RotationComparison } from '../features/rotations/components/RotationComparison';
import { VegetationPanel } from '../features/vegetation/components/VegetationPanel';
import { ScenarioPanel } from '../features/simulation/components/ScenarioPanel';
import { ScenarioProvider, useScenario } from '../features/simulation/state/scenario';

function Sections({ farmId }: { farmId: string }) {
  const { debounced } = useScenario();
  return (
    <>
      <FarmDashboard farmId={farmId} />
      <UploadWizard farmId={farmId} />
      <LeafAssessmentPanel key={farmId} farmId={farmId} />
      <ScenarioPanel farmId={farmId} />
      <VegetationPanel key={`vegetation-${farmId}`} farmId={farmId} scenario={debounced} />
      <RotationComparison
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

interface DashboardPageProps {
  farmId: string;
  onLeave: () => void;
  /** Guests see the demo wording; a signed-in farmer sees "Log out". */
  isDemoGuest?: boolean;
}

export function DashboardPage({ farmId, onLeave, isDemoGuest = true }: DashboardPageProps) {
  const { t } = useTranslation();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="stack">
      <div className="toolbar">
        <h2 ref={headingRef} tabIndex={-1}>
          {t(isDemoGuest ? 'dashboard.title' : 'dashboard.titleAccount')}
        </h2>
        <button type="button" className="button button--secondary" onClick={onLeave}>
          {t(isDemoGuest ? 'dashboard.leave' : 'dashboard.logout')}
        </button>
      </div>
      <ScenarioProvider>
        <Sections farmId={farmId} />
      </ScenarioProvider>
    </div>
  );
}
