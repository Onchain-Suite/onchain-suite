/* A workspace one minute after paying: empty, and then in use. These pin what "empty"
   actually clears, what each section says while it is, Cerebra's tour, and the one event —
   indexing a contract — that moves the workspace into use. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from './test/utils';
import { App } from './App';
import { store, useContracts, useLists } from './data/store';
import { useWalletSync } from './components/WalletSync';
import { beginIndexing, enterEmptyWorkspace, enterLiveWorkspace, useWorkspaceMode } from './data/workspace';
import { useTour } from './data/tour';

const LAZY = { timeout: 5000 };

function Probe() {
  const loc = useLocation();
  return (
    <output data-testid="probe">
      {JSON.stringify({
        path: loc.pathname, mode: useWorkspaceMode(), contracts: useContracts().length,
        lists: useLists().length, synced: useWalletSync() !== null, tour: useTour(),
      })}
    </output>
  );
}
const probe = () => JSON.parse(screen.getByTestId('probe').textContent ?? '{}');
const app = (route: string) => renderWithProviders(<><App /><Probe /></>, { route });

beforeEach(() => {
  store.completeOnboarding();
  enterEmptyWorkspace('acme.xyz');
});
afterEach(() => {
  vi.useRealTimers();
  enterLiveWorkspace();
});

describe('An empty workspace', () => {
  it('is actually empty, and in use brings the demo back', async () => {
    app('/campaigns');
    await screen.findByRole('heading', { level: 1, name: 'Campaigns' }, LAZY);
    expect(probe()).toMatchObject({ mode: 'empty', contracts: 0, lists: 0, synced: false });

    act(() => enterLiveWorkspace());
    expect(probe()).toMatchObject({ mode: 'live', contracts: 2 });
    expect(probe().lists).toBeGreaterThan(0);
  });

  it('says what each section is for and what fills it, instead of showing the demo', async () => {
    app('/campaigns');
    expect(await screen.findByRole('heading', { name: 'No campaigns yet' }, LAZY)).toBeInTheDocument();
    expect(screen.getByText('Waiting on your first indexed contract.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to Integrations/ })).toHaveAttribute('href', '/integrations');
    // The demo's campaigns are not presented as theirs.
    expect(screen.queryByText('Acme is live')).not.toBeInTheDocument();
  });

  it('lets Forms work on day one, since a form needs no indexed data', async () => {
    const user = userEvent.setup();
    app('/forms');
    expect(await screen.findByRole('heading', { name: 'No forms yet' }, LAZY)).toBeInTheDocument();
    expect(screen.queryByText('Waiting on your first indexed contract.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New form' }));
    // The builder, not just the empty state going away.
    expect(screen.getByRole('textbox', { name: 'Form name' })).toBeInTheDocument();
  });

  it('does not tell Integrations that anything is connected', async () => {
    app('/integrations');
    expect(await screen.findByText('Start here: index your contract', undefined, LAZY)).toBeInTheDocument();
    expect(screen.getByText('acme.xyz')).toBeInTheDocument();

    // A connected source carries a tick on its card. None should, with nothing indexed —
    // and the same card does once the workspace is in use, so this is not passing vacuously.
    const contractsCard = () => screen.getByRole('button', { name: /^Your contracts/ });
    expect(contractsCard().querySelector('.sdir__verified')).toBeNull();
    expect(document.querySelectorAll('.sdir__verified')).toHaveLength(0);
    act(() => enterLiveWorkspace());
    expect(contractsCard().querySelector('.sdir__verified')).not.toBeNull();
  });
});

describe('Notifications', () => {
  it('has nothing to report in an empty workspace, and counts what it lists in use', async () => {
    const user = userEvent.setup();
    app('/campaigns');
    await screen.findByRole('heading', { name: 'No campaigns yet' }, LAZY);
    expect(document.querySelector('.bell__badge')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('region', { name: 'Notifications' })).toHaveTextContent(/Nothing yet/);

    act(() => enterLiveWorkspace());
    const listed = screen.getByRole('region', { name: 'Notifications' }).querySelectorAll('.menu__row').length;
    expect(document.querySelector('.bell__badge')).toHaveTextContent(String(listed));
  });
});

describe('Cerebra’s tour', () => {
  it('starts on Home, walks the sidebar, and rings the section it is describing', async () => {
    const user = userEvent.setup();
    app('/home');
    const tour = await screen.findByRole('dialog', { name: 'This is Home' }, LAZY);
    expect(within(tour).getByText('1 of 9')).toBeInTheDocument();

    // The checklist gets its own stop, pointing at the panel in the sidebar.
    await user.click(within(tour).getByRole('button', { name: /Next/ }));
    expect(await screen.findByRole('dialog', { name: 'Start with this checklist' }, LAZY)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Getting started' })).toHaveClass('gs--tour');

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Next/ }));
    expect(await screen.findByRole('dialog', { name: 'Campaigns' }, LAZY)).toBeInTheDocument();
    expect(probe().path).toBe('/campaigns');
    const primary = within(screen.getByRole('navigation', { name: 'Primary' }));
    expect(primary.getByRole('link', { name: 'Campaigns' })).toHaveClass('side__item--tour');
  });

  it('does not hijack a deep link, and stays away once skipped', async () => {
    const user = userEvent.setup();
    app('/campaigns');
    await screen.findByRole('heading', { name: 'No campaigns yet' }, LAZY);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(probe().path).toBe('/campaigns');

    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Home' }));
    const tour = await screen.findByRole('dialog', { name: 'This is Home' }, LAZY);
    await user.click(within(tour).getByRole('button', { name: 'Skip tour' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(probe().tour).toMatchObject({ active: false, done: true });
  });
});

describe('Getting started', () => {
  it('stays in the sidebar on Home, and a new workspace opens it however it was left', async () => {
    const user = userEvent.setup();
    act(() => enterLiveWorkspace());
    app('/home');
    const checklist = () => screen.getByRole('region', { name: 'Getting started' });
    await screen.findByRole('region', { name: 'Getting started' }, LAZY);
    // A fixture of the nav: on Home too, and only once.
    expect(checklist().closest('aside')).not.toBeNull();
    expect(screen.getAllByRole('region', { name: 'Getting started' })).toHaveLength(1);

    await user.click(within(checklist()).getByRole('button', { name: 'Collapse getting started' }));
    expect(within(checklist()).getByRole('button', { name: 'Expand getting started' })).toHaveAttribute('aria-expanded', 'false');

    act(() => enterEmptyWorkspace());
    expect(within(checklist()).getByRole('button', { name: 'Collapse getting started' })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('Cerebra’s tour placement', () => {
  it('attaches to the sidebar row it is describing, and falls back to the corner without one', async () => {
    const user = userEvent.setup();
    app('/home');
    // jsdom has no layout, so every box is empty: nothing to attach to, so the corner.
    const first = await screen.findByRole('dialog', { name: 'This is Home' }, LAZY);
    expect(first).not.toHaveClass('ctour--anchored');

    // Give the sidebar rows a real box, as a browser would, and move to the next stop.
    const real = HTMLElement.prototype.getBoundingClientRect;
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.dataset.tour
        ? ({ top: 200, bottom: 236, height: 36, left: 12, right: 172, width: 160, x: 12, y: 200, toJSON: () => ({}) } as DOMRect)
        : real.call(this);
    });
    await user.click(within(first).getByRole('button', { name: /Next/ }));
    const next = await screen.findByRole('dialog', { name: 'Start with this checklist' }, LAZY);
    expect(next).toHaveClass('ctour--anchored');
    // Just right of the row, not in the bottom-right corner.
    expect(next.style.left).toBe('186px');
    spy.mockRestore();
  });
});

describe('Indexing the first contract', () => {
  it('moves the workspace into use when it finishes, not before', () => {
    vi.useFakeTimers();
    app('/integrations');
    act(() => beginIndexing('Acme Packs'));
    expect(probe().mode).toBe('empty');
    act(() => { vi.advanceTimersByTime(4000); });
    expect(probe().mode).toBe('live');
  });
});
