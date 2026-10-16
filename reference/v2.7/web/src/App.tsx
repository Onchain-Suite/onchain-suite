import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import NotFound from './screens/NotFound';
import { Shell } from './shell/Shell';
import { useOnboarded } from './data/store';
import { SkeletonRows } from './components/ui';

// Route-level code-splitting: each screen is its own chunk, loaded on demand.
const Dashboard = lazy(() => import('./screens/DashboardScreen'));
const Campaigns = lazy(() => import('./screens/CampaignsScreen'));
const Audience = lazy(() => import('./screens/AudienceScreen'));
const Forms = lazy(() => import('./screens/FormsScreen'));
const Automations = lazy(() => import('./screens/AutomationsScreen'));
const Intelligence = lazy(() => import('./screens/IntelligenceScreen'));
const Analytics = lazy(() => import('./screens/AnalyticsScreen'));
const Settings = lazy(() => import('./screens/SettingsScreen'));
const DataScreen = lazy(() => import('./screens/DataScreen'));
const GuidedOnboarding = lazy(() => import('./screens/GuidedOnboarding'));
const PublicDashboard = lazy(() => import('./screens/PublicDashboard'));

function ScreenFallback() {
  return <div className="page"><SkeletonRows rows={6} height={60} /></div>;
}

export function App() {
  const onboarded = useOnboarded();

  /* Checked before the onboarding gate and outside the Shell: a published link has to open
     for someone with no account, and the catch-all below would otherwise hand them a setup
     flow for a workspace that is not theirs. */
  const published = (
    <Route path="/d/:token" element={<Suspense fallback={<ScreenFallback />}><PublicDashboard /></Suspense>} />
  );

  /* Also outside the Shell, and matched whether or not the workspace is already set up:
     /onboarding is a real address, so it survives a reload and can be handed to someone
     verbatim. The catch-all below is what a brand-new workspace falls through to. */
  const onboarding = (
    <Route path="/onboarding" element={<Suspense fallback={<ScreenFallback />}><GuidedOnboarding /></Suspense>} />
  );

  if (!onboarded) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          {published}
          {onboarding}
          <Route path="*" element={<GuidedOnboarding />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Routes>
      {published}
      {onboarding}
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><Dashboard /></Suspense></ErrorBoundary>} />
        {/* 2.7 renames this screen to Home and gives "Dashboard" to analytics, matching how
            both incumbents split the two. The old path stays live so nothing that links to
            /dashboard breaks. */}
        <Route path="/home" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><Dashboard /></Suspense></ErrorBoundary>} />
        {/* Data became Integrations: the section is what plugs into the product, and "Data"
            described the contents rather than the job. The old path stays live so nothing
            that links to /data breaks. */}
        <Route path="/integrations" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><DataScreen /></Suspense></ErrorBoundary>} />
        <Route path="/data" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><DataScreen /></Suspense></ErrorBoundary>} />
        <Route path="/campaigns" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><Campaigns /></Suspense></ErrorBoundary>} />
        <Route path="/audience" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><Audience /></Suspense></ErrorBoundary>} />
        <Route path="/forms" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><Forms /></Suspense></ErrorBoundary>} />
        <Route path="/automations" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><Automations /></Suspense></ErrorBoundary>} />
        <Route path="/intelligence" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><Intelligence /></Suspense></ErrorBoundary>} />
        {/* Analytics opens the default Dashboard; every dashboard has its own address, and
            the list of them is /analytics/all. A list with one default row is not where
            anyone is trying to get to. */}
        <Route path="/analytics" element={<Navigate to="/analytics/overview" replace />} />
        {/* Subscriptions folded into Engagement; links to the old tab land on its new home. */}
        <Route path="/analytics/subscriptions" element={<Navigate to="/analytics/engagement" replace />} />
        <Route path="/analytics/:dash" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><Analytics /></Suspense></ErrorBoundary>} />
        <Route path="/settings" element={<ErrorBoundary><Suspense fallback={<ScreenFallback />}><Settings /></Suspense></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
