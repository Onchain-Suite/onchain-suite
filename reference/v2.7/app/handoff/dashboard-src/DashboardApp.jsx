import React from 'react';
import { AppShell } from './AppShell.jsx';
import { HomeScreen } from './HomeScreen.jsx';
import { CampaignsScreen } from './CampaignsScreen.jsx';
import { AudienceScreen } from './AudienceScreen.jsx';
import { AutomationsScreen } from './AutomationsScreen.jsx';
import { IntelligenceScreen } from './IntelligenceScreen.jsx';
import { AnalyticsScreen } from './AnalyticsScreen.jsx';
import { FormsScreen } from './FormsScreen.jsx';
import { SettingsScreen } from './SettingsScreen.jsx';
import { OnboardingScreen } from './OnboardingScreen.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid' },
  { id: 'campaigns', label: 'Campaigns', icon: 'megaphone' },
  { id: 'audience', label: 'Audience', icon: 'users' },
  { id: 'forms', label: 'Forms', icon: 'clipboard-list' },
  { id: 'automations', label: 'Automations', icon: 'zap' },
  { id: 'intelligence', label: 'Intelligence', icon: 'sparkles' },
  { id: 'analytics', label: 'Analytics', icon: 'line-chart' },
  { id: 'settings', label: 'Settings', icon: 'settings-2' },
];

const CRUMB = {
  dashboard: [],
  campaigns: ['Home', 'Campaigns'],
  audience: ['Home', 'Audience'],
  forms: ['Home', 'Forms'],
  automations: ['Home', 'Automations'],
  intelligence: ['Home', 'Intelligence'],
  analytics: ['Home', 'Analytics'],
  settings: ['Home', 'Settings'],
};

/** Full interactive dashboard shell recreated from product screenshots, with light/dark toggle. */
export function DashboardApp({ logoSrc = '../../assets/logos/icon-coloured-light.svg' }) {
  const [page, setPage] = React.useState('dashboard');
  const [filled, setFilled] = React.useState(false);
  const [phase, setPhase] = React.useState('onboarding');
  const [campaignSeed, setCampaignSeed] = React.useState(null);
  const [askSeed, setAskSeed] = React.useState(null);
  const goCampaign = (seed) => { setCampaignSeed(seed || {}); setPage('campaigns'); };
  const goAsk = (question) => { setAskSeed(question); setPage('intelligence'); };
  const [theme, setTheme] = React.useState(() => {
    try { return localStorage.getItem('os-dash-theme') || 'light'; } catch (e) { return 'light'; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('os-dash-theme', theme); } catch (e) {}
  }, [theme]);
  const screen =
    page === 'dashboard' ? <HomeScreen filled={filled} onAsk={goAsk} /> :
    page === 'campaigns' ? <CampaignsScreen filled={filled} seed={campaignSeed} onSeedConsumed={() => setCampaignSeed(null)} /> :
    page === 'audience' ? <AudienceScreen filled={filled} onCreateCampaign={goCampaign} /> :
    page === 'forms' ? <FormsScreen filled={filled} /> :
    page === 'automations' ? <AutomationsScreen filled={filled} /> :
    page === 'intelligence' ? <IntelligenceScreen filled={filled} onCreateCampaign={goCampaign} seedQuestion={askSeed} onSeedConsumed={() => setAskSeed(null)} /> :
    page === 'analytics' ? <AnalyticsScreen filled={filled} /> :
    page === 'settings' ? <SettingsScreen user="Olusegun Aborode" workspace="DatumLabs" /> :
    null;
  if (phase === 'onboarding') {
    return (
      <div data-theme={theme === 'dark' ? 'dark' : undefined} data-screen-label="Dashboard · onboarding" style={{ background: 'var(--bg-page)' }}>
        <OnboardingScreen logoSrc={logoSrc}
          onDone={() => { setFilled(true); setPhase('app'); setPage('dashboard'); }}
          onSkip={() => { setPhase('app'); setPage('dashboard'); }} />
      </div>
    );
  }
  return (
    <div data-theme={theme === 'dark' ? 'dark' : undefined} data-screen-label={`Dashboard · ${page}`} style={{ background: 'var(--bg-page)' }}>
      <AppShell
        nav={NAV} active={page} onNavigate={setPage}
        breadcrumbs={CRUMB[page] || []}
        workspace="DatumLabs" user="Olusegun Aborode" notificationCount={2}
        theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        logoSrc={logoSrc}
      >
        {screen}
      </AppShell>
      {page === 'dashboard' || page === 'campaigns' || page === 'audience' || page === 'forms' || page === 'automations' || page === 'intelligence' || page === 'analytics' ? (
      <div style={{ position: 'fixed', bottom: 18, right: 18, zIndex: 100, display: 'flex', background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--elevation-2)', overflow: 'hidden', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500 }}>
        <button type="button" onClick={() => setFilled(false)} style={{ border: 'none', cursor: 'pointer', padding: '8px 14px', background: !filled ? 'var(--bg-selected)' : 'transparent', color: !filled ? 'var(--action-primary)' : 'var(--text-secondary)', font: 'inherit' }}>Empty state</button>
        <button type="button" onClick={() => setFilled(true)} style={{ border: 'none', cursor: 'pointer', padding: '8px 14px', background: filled ? 'var(--bg-selected)' : 'transparent', color: filled ? 'var(--action-primary)' : 'var(--text-secondary)', font: 'inherit' }}>Full state</button>
      </div>
      ) : null}
    </div>
  );
}
