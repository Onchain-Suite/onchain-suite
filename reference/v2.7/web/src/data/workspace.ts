import { useSyncExternalStore } from 'react';
import { loadPersisted, savePersisted } from './persist';
import { store } from './store';
import { clearWalletSync } from '../components/WalletSync';
import { resetTour } from './tour';
import { openGettingStarted } from '../components/GettingStarted';
import { EMPTY_PROFILE, type ProjectProfile } from './guidedOnboarding';
import { toast } from '../components/toast';

/* Workspace state: empty, then in use.
 *
 * Onboarding stopped doing work before payment — no indexing, no enrichment — so a workspace
 * that has just paid has nothing in it, and the app has to say so rather than show the demo
 * as if it were theirs. "Empty" is the state between paying and the first data arriving; "in
 * use" is everything after.
 *
 * In this build "in use" is the seeded demo workspace, which is what a populated workspace
 * looks like. The project they named in onboarding is kept so the empty state can point at
 * it ("index Acme to fill this") instead of asking for it a second time. */

export type WorkspaceMode = 'empty' | 'live';

const MODE_KEY = 'workspaceMode';
const PROJECT_KEY = 'pendingProject';

let mode: WorkspaceMode = loadPersisted<WorkspaceMode>(MODE_KEY, 'live');
/** The contract being indexed right now, if any. Not persisted: a reload mid-index lands
 *  back in the empty state, which is where the index would still be on a real backend. */
let indexing: string | null = null;
let project: string = loadPersisted<string>(PROJECT_KEY, '');
const subs = new Set<() => void>();
const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };
const notify = () => subs.forEach((fn) => fn());

export function useWorkspaceMode(): WorkspaceMode {
  return useSyncExternalStore(subscribe, () => mode, () => mode);
}

/** The contract whose index is in progress, so the empty states can say "on its way" rather
 *  than "nothing here" during the one stretch where both are true. */
export function useIndexing(): string | null {
  return useSyncExternalStore(subscribe, () => indexing, () => indexing);
}

/** What they typed in onboarding — an address, a name or a website. Empty if they never did. */
export function usePendingProject(): string {
  return useSyncExternalStore(subscribe, () => project, () => project);
}

/* Forms live outside the store, in their own persisted list, so they are cleared here. In
   use, an empty list is what lets the Forms screen seed the demo forms back. */
const FORMS_KEY = 'forms';

export function enterEmptyWorkspace(projectInput = project, { keepSender = false }: { keepSender?: boolean } = {}) {
  store.emptyWorkspace({ keepSender });
  clearWalletSync();
  savePersisted(FORMS_KEY, []);
  resetTour();
  openGettingStarted();
  mode = 'empty';
  project = projectInput.trim();
  savePersisted(MODE_KEY, mode);
  savePersisted(PROJECT_KEY, project);
  notify();
}

/** Data has arrived. The demo state comes back as the picture of a workspace in use. */
export function enterLiveWorkspace() {
  store.seedWorkspace();
  savePersisted(FORMS_KEY, []);
  mode = 'live';
  savePersisted(MODE_KEY, mode);
  notify();
}

/* Indexing the first contract is what moves an empty workspace into use.
 *
 * In this build the index is simulated: a pause long enough to read as real work, then the
 * workspace in use. The pause matters — flipping instantly would make "empty" look like a
 * loading glitch rather than the honest state of a workspace whose data is still arriving. */
const INDEX_MS = 4000;

export function beginIndexing(name: string) {
  if (mode !== 'empty' || indexing) return;
  indexing = name;
  notify();
  window.setTimeout(() => {
    indexing = null;
    enterLiveWorkspace();
    toast(`${name} is indexed. Your workspace is live`);
  }, INDEX_MS);
}

/* The project as described in onboarding. Kept so nothing asks for it twice, and so the
   qualification answers outlive the flow that collected them. */
const PROFILE_KEY = 'projectProfile';
let profile: ProjectProfile = loadPersisted<ProjectProfile>(PROFILE_KEY, EMPTY_PROFILE);

export function saveProjectProfile(next: ProjectProfile) {
  profile = { ...next };
  savePersisted(PROFILE_KEY, profile);
  notify();
}

export function useProjectProfile(): ProjectProfile {
  return useSyncExternalStore(subscribe, () => profile, () => profile);
}

/* An Enterprise offer, requested from onboarding. Enterprise is priced per customer, so the
   flow cannot charge for it; it records the size they asked for and the workspace opens as
   usual while the offer is prepared. Billing reads this to say so. */
export interface OfferRequest { contacts: number; requestedAt: string }
const OFFER_KEY = 'offerRequest';
let offer: OfferRequest | null = loadPersisted<OfferRequest | null>(OFFER_KEY, null);

export function requestOffer(contacts: number) {
  offer = { contacts, requestedAt: new Date().toISOString() };
  savePersisted(OFFER_KEY, offer);
  notify();
}

export function useOfferRequest(): OfferRequest | null {
  return useSyncExternalStore(subscribe, () => offer, () => offer);
}
