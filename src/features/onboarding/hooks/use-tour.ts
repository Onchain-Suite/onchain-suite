"use client";

import { useSyncExternalStore } from "react";

import { TOUR } from "../data/tour";

/**
 * Product-tour state (v2.7 onboarding migration, step 6).
 *
 * A tiny module-level store so the tour can be started from one place (the
 * dashboard auto-start, or the checklist's "Take the tour" button) and rendered
 * by the callout anywhere. `done` persists to localStorage so the tour does not
 * reappear on its own once skipped or finished; skipping and finishing are the
 * same outcome. `resetTour` clears it for a genuinely new workspace.
 */

const DONE_KEY = "onchain.onboarding.tourDone";

function readDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDone(value: boolean): void {
  try {
    window.localStorage.setItem(DONE_KEY, value ? "1" : "0");
  } catch {
    // per-viewer persistence only
  }
}

export interface TourState {
  active: boolean;
  index: number;
  done: boolean;
}

let state: TourState = { active: false, index: 0, done: readDone() };
const subs = new Set<() => void>();

function emit(next: Partial<TourState>) {
  state = { ...state, ...next };
  subs.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function useTour(): TourState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}

export function startTour() {
  emit({ active: true, index: 0 });
}

export function tourNext() {
  if (state.index >= TOUR.length - 1) {
    endTour();
    return;
  }
  emit({ index: state.index + 1 });
}

export function tourBack() {
  if (state.index > 0) emit({ index: state.index - 1 });
}

/** Skipping and finishing are the same: either way it does not come back on its own. */
export function endTour() {
  writeDone(true);
  emit({ active: false, done: true });
}

/** A genuinely fresh workspace has not seen the tour. */
export function resetTour() {
  writeDone(false);
  emit({ active: false, index: 0, done: false });
}
