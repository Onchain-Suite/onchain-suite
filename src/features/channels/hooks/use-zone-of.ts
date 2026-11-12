"use client";

import { useEffect, useState } from "react";

import { zoneOf } from "../utils/dns-view";

type Registrable = (domain: string) => string | null;

let loaded: Promise<Registrable> | null = null;

/**
 * The public suffix list, fetched once and only when a sending domain is on
 * screen: it is 40 kB that nothing else in the app needs. ICANN suffixes only.
 * A domain under a private suffix (a hosting platform's) has no zone of its
 * own to add records to.
 */
function loadRegistrable(): Promise<Registrable> {
  loaded ??= import("tldts").then(
    ({ getDomain }) =>
      (domain: string) =>
        getDomain(domain, { allowPrivateDomains: false })
  );
  return loaded;
}

/**
 * The DNS zone a sending domain's records are added to, or null while it is
 * not known (the list is still loading, failed to load, or does not place the
 * domain). Null is safe: the records are shown by their whole names.
 */
export function useZoneOf(domain: string): string | null {
  const [registrable, setRegistrable] = useState<Registrable | null>(null);
  useEffect(() => {
    let live = true;
    loadRegistrable()
      .then((fn) => {
        if (live) setRegistrable(() => fn);
      })
      .catch(() => {
        // Whole names it is. Try again on the next mount.
        loaded = null;
      });
    return () => {
      live = false;
    };
  }, []);
  return zoneOf(domain, registrable);
}
