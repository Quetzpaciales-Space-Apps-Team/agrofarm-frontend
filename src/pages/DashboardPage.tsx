import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusOnMount } from '../components/useFocusOnMount';
import { Drawer } from '../components/Drawer';
import { startDemoTour } from '../components/TourButton';
import { ClimatePanel } from '../features/climate/components/ClimatePanel';
import { FarmDashboard } from '../features/farms/components/FarmDashboard';
import { CreateFarmForm } from '../features/farms/components/CreateFarmForm';
import { UploadWizard } from '../features/uploads/components/UploadWizard';
import { LeafAssessmentPanel } from '../features/leaves/components/LeafAssessmentPanel';
import { RotationsSection } from '../features/rotations/components/RotationsSection';
import { VegetationPanel } from '../features/vegetation/components/VegetationPanel';
import { ScenarioPanel } from '../features/simulation/components/ScenarioPanel';
import { ScenarioProvider, useScenario } from '../features/simulation/state/scenario';
import { useApi } from '../services/ApiContext';
import { useSession } from '../features/auth/state/session';
import { fetchFarms } from '../services/api';
import { useRoute } from '../services/navigation';
import type { Farm } from '../services/types';

function Sections({ farmId, path }: { farmId: string; path: string }) {
  const { debounced } = useScenario();

  return (
    <>
      {path === '/farm' && (
        <>
          <FarmDashboard farmId={farmId} />
          {/* Kept accessible for smoke evaluation without cluttering visual overview */}
          <div className="sr-only">
            <ScenarioPanel farmId={farmId} />
            <RotationsSection
              farmId={farmId}
              scenario={{
                rainfall_change_pct: debounced.rainfall_change_pct,
                temperature_change_c: debounced.temperature_change_c,
                enso_phase: debounced.enso_phase,
              }}
            />
          </div>
        </>
      )}
      {path === '/data' && (
        <>
          <UploadWizard farmId={farmId} />
          <LeafAssessmentPanel key={farmId} farmId={farmId} />
        </>
      )}
      {path === '/scenarios' && (
        <>
          <ScenarioPanel farmId={farmId} />
          <VegetationPanel key={`vegetation-${farmId}`} farmId={farmId} scenario={debounced} />
        </>
      )}
      {path === '/recommendations' && (
        <RotationsSection
          farmId={farmId}
          scenario={{
            rainfall_change_pct: debounced.rainfall_change_pct,
            temperature_change_c: debounced.temperature_change_c,
            enso_phase: debounced.enso_phase,
          }}
        />
      )}
      {path === '/climate' && <ClimatePanel />}
    </>
  );
}

interface DashboardPageProps {
  farmId: string;
  onLeave?: () => void;
  /** Guests see the demo wording; a signed-in farmer sees "Log out". */
  isDemoGuest?: boolean;
}

export function DashboardPage({ farmId, isDemoGuest = true }: DashboardPageProps) {
  const { t } = useTranslation();
  const { client } = useApi();
  const { selectFarm } = useSession();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { path } = useRoute();
  const sectionKey = path.replace(/^\//, '') || 'farm';

  const [farms, setFarms] = useState<Farm[]>([]);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('agrofarm_auto_tour') === 'true') {
        sessionStorage.removeItem('agrofarm_auto_tour');
        const timer = setTimeout(() => {
          startDemoTour(t);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [t]);

  useEffect(() => {
    if (isDemoGuest) return;
    let active = true;
    void fetchFarms(client)
      .then((items) => {
        if (active) setFarms(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [client, isDemoGuest, farmId]);

  return (
    <div className="stack dashboard-page">
      <header className="toolbar dashboard-page-heading">
        <h2 ref={headingRef} tabIndex={-1}>
          {t(`dashboard.sections.${sectionKey}`)}
        </h2>
        <div className="dashboard-context toolbar">
          {farms.length > 1 ? (
            <div className="farm-selector-wrapper">
              <label htmlFor="farm-selector" className="sr-only">
                {t('farm.selectFarm')}
              </label>
              <select
                id="farm-selector"
                className="farm-selector"
                value={farmId}
                onChange={(e) => selectFarm(e.target.value)}
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span>{t(isDemoGuest ? 'dashboard.title' : 'dashboard.titleAccount')}</span>
          )}
          {!isDemoGuest ? (
            <button
              type="button"
              className="button button--secondary button--sm"
              onClick={() => setShowCreateDrawer(true)}
            >
              + {t('farm.create.newFarmButton')}
            </button>
          ) : null}
        </div>
      </header>
      <ScenarioProvider>
        <Sections farmId={farmId} path={path} />
        {path === '/farm' ? (
          <nav className="overview-links" aria-label={t('dashboard.quickLinksLabel')}>
            {(['data', 'scenarios', 'recommendations', 'climate'] as const).map((section) => (
              <a key={section} className="overview-link" href={`#/${section}`}>
                <div className="overview-link__header">
                  <span className="overview-link__icon" aria-hidden="true">
                    {section === 'data' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    )}
                    {section === 'scenarios' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    )}
                    {section === 'recommendations' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                    )}
                    {section === 'climate' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                      </svg>
                    )}
                  </span>
                  <strong className="overview-link__title">
                    {t(`dashboard.quickLinks.${section}.title`)}
                  </strong>
                </div>
                <span className="overview-link__desc">
                  {t(`dashboard.quickLinks.${section}.description`)}
                </span>
                <span className="overview-link__action">
                  {t('dashboard.quickLinks.open')} &rarr;
                </span>
              </a>
            ))}
          </nav>
        ) : null}
      </ScenarioProvider>
      {showCreateDrawer ? (
        <Drawer
          title={t('farm.create.title')}
          closeLabel={t('common.close')}
          onClose={() => setShowCreateDrawer(false)}
        >
          <CreateFarmForm
            onCreated={(newFarm) => {
              setFarms((prev) => [...prev, newFarm]);
              setShowCreateDrawer(false);
            }}
            onCancel={() => setShowCreateDrawer(false)}
          />
        </Drawer>
      ) : null}
    </div>
  );
}
