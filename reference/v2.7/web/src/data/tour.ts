import { useSyncExternalStore } from 'react';
import { loadPersisted, savePersisted } from './persist';

/* Cerebra's tour of the app (first login, empty workspace).
 *
 * A workspace one minute after paying has nothing in it, so every screen is an empty state —
 * and eight empty states in a row explain nothing about how the product fits together. The
 * tour walks the sidebar in order, one stop per section: what the section is for, and what
 * it is waiting on. It ends at Integrations because that is where every other section's data
 * comes from.
 *
 * Copy describes the section, not the demo: it has to stay true for a workspace with nothing
 * in it, which is the only kind that sees it. */

export interface TourStop {
  /** The route this stop opens. */
  to: string;
  /** What the callout points at, by its `data-tour` name. Defaults to the sidebar row for `to`. */
  anchor?: string;
  title: string;
  body: string;
}

export const TOUR: TourStop[] = [
  { to: '/home', title: 'This is Home',
    body: 'Where you land. Once your data arrives, it shows what moved across your workspace today.' },
  { to: '/home', anchor: 'getting-started', title: 'Start with this checklist',
    body: 'Six steps from paying to your first send. It stays here in the sidebar until they are done. Open any step to see what it needs.' },
  { to: '/campaigns', title: 'Campaigns',
    body: 'One-off sends to an audience, by email, in-app push or X. They need someone to send to, so they come alive once your contract is indexed.' },
  { to: '/automations', title: 'Loops',
    body: 'Flows that run without you. A wallet goes quiet, stakes or finishes onboarding, and moves through the steps you set. Loops trigger on on-chain and product events.' },
  { to: '/forms', title: 'Forms',
    body: 'Sign-up forms that turn visitors into verified contacts. These work before any data arrives, so you can build one while indexing runs.' },
  { to: '/audience', title: 'Audience',
    body: 'Everyone you can reach: holders from your contracts, with email, push and X joined on. Lists and segments live here too.' },
  { to: '/intelligence', title: 'Intelligence',
    body: 'Ask about your holders in plain English: who went dormant, who the whales are, who opened but never clicked. Answers come from your own data.' },
  { to: '/analytics', title: 'Analytics',
    body: 'Your numbers, as dashboards. Any of them can be published to a link your team can open without an account.' },
  { to: '/integrations', title: 'Start here',
    body: 'Integrations is where data comes in. Index your contract and connect the channels you send on. Every other section fills in from this.' },
];

const DONE_KEY = 'tourDone';

let active = false;
let index = 0;
let done = loadPersisted<boolean>(DONE_KEY, false);
const subs = new Set<() => void>();
const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };
const notify = () => subs.forEach((fn) => fn());

type TourState = { active: boolean; index: number; done: boolean };
let snapshot: TourState = { active, index, done };
const set = (next: Partial<TourState>) => {
  ({ active, index, done } = { active, index, done, ...next });
  snapshot = { active, index, done };
  notify();
};

export function useTour(): TourState {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export function startTour() {
  set({ active: true, index: 0 });
}

export function tourNext() {
  if (index >= TOUR.length - 1) return endTour();
  set({ index: index + 1 });
}

export function tourBack() {
  if (index > 0) set({ index: index - 1 });
}

/** Skipping and finishing are the same thing: either way, it does not come back on its own. */
export function endTour() {
  savePersisted(DONE_KEY, true);
  set({ active: false, done: true });
}

/** A fresh workspace is a new customer, who has not seen it. */
export function resetTour() {
  savePersisted(DONE_KEY, false);
  set({ active: false, index: 0, done: false });
}

/** Where a stop points: its named target, or the sidebar row for its route. */
export const anchorOf = (stop: TourStop) => stop.anchor ?? stop.to;
