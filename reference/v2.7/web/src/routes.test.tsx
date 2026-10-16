/* The address bar is part of the interface. These assert the paths a person can type or
   reload, as distinct from state the app happens to be holding. */
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from './test/utils';
import { App } from './App';

/* These render the whole App, so each first query waits on a lazy-loaded route chunk. The
   library's 1s default is fine on an idle machine and flaky on a busy one — a dev server
   booting alongside was enough to fail two of them. */
const LAZY = { timeout: 5000 };
import { store } from './data/store';
import { newSpec } from './data/chartBuilder';

describe('/onboarding', () => {
  beforeEach(() => {
    // A set-up workspace: the flow is reachable because it is a route, not because the
    // first-run flag happens to be unset.
    store.completeOnboarding();
  });

  it('opens the first-run flow on a set-up workspace, and keeps it out of the Shell', async () => {
    renderWithProviders(<App />, { route: '/onboarding' });

    expect(await screen.findByRole('heading', { name: 'Tell us about your project' }, LAZY)).toBeInTheDocument();
    // No app chrome around it — a replay is the flow, not a screen inside the product.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('still routes a set-up workspace to the product elsewhere', async () => {
    renderWithProviders(<App />, { route: '/campaigns' });

    expect(await screen.findByRole('heading', { name: 'Campaigns' }, LAZY)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Where does your community live?' })).not.toBeInTheDocument();
  });
});

describe('/analytics', () => {
  beforeEach(() => {
    store.completeOnboarding();
    localStorage.removeItem('os:dashTabs');
    localStorage.removeItem('os:dashCards');
  });

  it('opens the default Dashboard, on its first tab', async () => {
    renderWithProviders(<App />, { route: '/analytics' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, LAZY)).toBeInTheDocument();
    const tabs = within(screen.getByRole('navigation', { name: 'Dashboard tabs' }));
    // The row also carries the All dashboards link; the tabs are the rest.
    const tabNames = tabs.getAllByRole('link').filter((l) => l.getAttribute('href') !== '/analytics/all').map((l) => l.textContent);
    expect(tabNames).toEqual(['Overview', 'Conversions', 'Engagement', 'Retention']);
    expect(tabs.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });

  it('lists one default Dashboard and the ones you made, not five', async () => {
    localStorage.setItem('os:dashTabs', JSON.stringify([{ id: 'uwhales', label: 'Whale watch' }]));
    const { container } = renderWithProviders(<App />, { route: '/analytics/all' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboards' }, LAZY)).toBeInTheDocument();
    // The five sections are tabs of the default, so they are not rows of their own.
    const list = within(container.querySelector('.dash__table') as HTMLElement);
    expect(list.getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Dashboard', '/analytics/overview'],
      ['Whale watch', '/analytics/uwhales'],
    ]);
    expect(list.getByText(/^4 tabs/)).toBeInTheDocument();
  });

  it('opens a tab of the default directly, so a link to it survives a reload', async () => {
    renderWithProviders(<App />, { route: '/analytics/engagement' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, LAZY)).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Dashboard tabs' })).getByRole('link', { name: 'Engagement' }))
      .toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Email open rate')).toBeInTheDocument();
  });

  it('shows a dashboard you made as its own page, without the default tabs', async () => {
    localStorage.setItem('os:dashTabs', JSON.stringify([{ id: 'uwhales', label: 'Whale watch' }]));
    renderWithProviders(<App />, { route: '/analytics/uwhales' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Whale watch' }, LAZY)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Dashboard tabs' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rename/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add a chart/ })).toBeInTheDocument();
  });

  /* Subscriptions was a tab with one chart; it is the end of Engagement now. Old links and any
     charts someone added to it follow it there. */
  it('sends the old Subscriptions tab to Engagement, charts and all', async () => {
    localStorage.setItem('os:dashCards', JSON.stringify({
      subscriptions: [{ ...newSpec(), id: 'mine', title: 'My list chart' }],
    }));
    renderWithProviders(<App />, { route: '/analytics/subscriptions' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, LAZY)).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Dashboard tabs' })).getByRole('link', { name: 'Engagement' }))
      .toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Opt-in list growth')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem('os:dashCards') ?? '{}');
    expect(saved.subscriptions).toBeUndefined();
    expect(saved.engagement.map((c: { id: string }) => c.id)).toEqual(['mine']);
  });

  it('says so when the dashboard in the link no longer exists', async () => {
    renderWithProviders(<App />, { route: '/analytics/u-deleted' });

    expect(await screen.findByText('This dashboard does not exist', undefined, LAZY)).toBeInTheDocument();
    // Not a blank page that reads as a broken app, and with a way back.
    expect(screen.getByRole('link', { name: 'See all dashboards' })).toHaveAttribute('href', '/analytics/all');
  });
});


/* Agreed at the co-founders' meeting and in the dev review independently: every section is
   one click from anywhere, under the plain name for it. These pin both halves of that. */
describe('the sidebar', () => {
  beforeEach(() => {
    store.completeOnboarding();
  });

  it('reaches every section in one click, under the plain names', async () => {
    renderWithProviders(<App />, { route: '/intelligence' });

    const primary = within(await screen.findByRole('navigation', { name: 'Primary' }, LAZY));
    const links = primary.getAllByRole('link').map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(links).toEqual([
      ['Home', '/home'],
      ['Campaigns', '/campaigns'],
      ['Loops', '/automations'],
      ['Forms', '/forms'],
      ['Audience', '/audience'],
      ['Intelligence', '/intelligence'],
      ['Analytics', '/analytics'],
      ['Integrations', '/integrations'],
    ]);
  });

  it('does not group Campaigns, Loops and Forms behind one tab strip', async () => {
    renderWithProviders(<App />, { route: '/automations' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Loops' }, LAZY)).toBeInTheDocument();
    // The strip was the second half of the click cost: you still had to land on one of the
    // three to switch between them.
    expect(screen.queryByRole('navigation', { name: 'Section' })).not.toBeInTheDocument();
  });

  it('keeps the old /data address working after the rename to Integrations', async () => {
    renderWithProviders(<App />, { route: '/data' });

    const primary = within(await screen.findByRole('navigation', { name: 'Primary' }, LAZY));
    expect(primary.getByRole('link', { name: 'Integrations' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Integrations');
  });
});
