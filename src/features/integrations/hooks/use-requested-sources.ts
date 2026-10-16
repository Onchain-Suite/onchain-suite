"use client";

import { useSyncExternalStore } from "react";

/**
 * "Request a source" store. When search misses, we record the tool name the
 * person typed: those names are the only honest ranking of what to integrate
 * next, better than any roadmap vote, because the person typing has the data in
 * hand. A dead "no results" loses that signal, so a miss records the name and
 * the UI offers the two universal fallbacks instead.
 *
 * Kept client-side in localStorage short-term (per migration/integrations.md);
 * it moves behind a backend endpoint when one exists. Every storage access is
 * wrapped so a private window or blocked storage degrades to in-memory only.
 */

const REQUEST_KEY = "ons.source-requests";

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REQUEST_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function save(values: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REQUEST_KEY, JSON.stringify(values));
  } catch {
    // Storage unavailable (private window, blocked). In-memory state still works.
  }
}

let requested: string[] = load();
const subscribers = new Set<() => void>();

function emit(): void {
  save(requested);
  subscribers.forEach((f) => f());
}

/**
 * Record a tool nobody can connect yet. Deduped case-insensitively ("heap",
 * "Heap" and "HEAP " are one request), capped at 60 chars. Returns false when
 * the name is empty, too long, or already recorded.
 */
export function requestSource(name: string): boolean {
  const v = name.trim().replace(/\s+/g, " ");
  if (!v || v.length > 60) return false;
  if (requested.some((r) => r.toLowerCase() === v.toLowerCase())) return false;
  requested = [...requested, v];
  emit();
  return true;
}

export function useRequestedSources(): string[] {
  return useSyncExternalStore(
    (f) => {
      subscribers.add(f);
      return () => subscribers.delete(f);
    },
    () => requested,
    () => []
  );
}
