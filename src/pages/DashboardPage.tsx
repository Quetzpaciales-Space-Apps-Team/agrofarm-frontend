import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { ClimatePanel } from '../features/climate/components/ClimatePanel';
import { FarmDashboard } from '../features/farms/components/FarmDashboard';

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
      <FarmDashboard farmId={farmId} />
      <ClimatePanel />
    </div>
  );
}
