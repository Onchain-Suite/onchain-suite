"use client";

import { useSyncExternalStore } from "react";

import { getConsent, type StoredConsent, subscribeConsent } from "./consent";

/** The stored choice, or null before the visitor has chosen (and on the server). */
export function useConsent(): StoredConsent | null {
  return useSyncExternalStore(subscribeConsent, getConsent, () => null);
}
