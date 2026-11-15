import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSession } from '../features/auth/state/session';
import { DashboardPage } from '../pages/DashboardPage';
import { LandingPage } from '../pages/LandingPage';

function SectionPlaceholder({ section }: { section: string }) {
  const { t } = useTranslation();
  return (
    <section className="card stack" aria-labelledby="section-title">
      <h2 id="section-title">{t(`navigation.items.${section}`)}</h2>
      <p>{t('navigation.comingSoon')}</p>
    </section>
  );
}

function ActiveRoutes({ farmId, leave }: { farmId: string; leave: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onLeave = () => {
    leave();
    navigate('/');
  };

  if (location.pathname === '/') return <Navigate to="/overview" replace />;
  return (
    <Routes>
      <Route path="/overview" element={<DashboardPage farmId={farmId} onLeave={onLeave} />} />
      <Route path="/farm" element={<SectionPlaceholder section="farm" />} />
      <Route path="/data" element={<SectionPlaceholder section="data" />} />
      <Route path="/scenario" element={<SectionPlaceholder section="scenario" />} />
      <Route path="/results" element={<SectionPlaceholder section="results" />} />
      <Route path="/recommendations" element={<SectionPlaceholder section="recommendations" />} />
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}

export function AppRoutes() {
  const { status, farmId, leave } = useSession();
  return status === 'active' && farmId ? (
    <ActiveRoutes farmId={farmId} leave={leave} />
  ) : (
    <Routes>
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
