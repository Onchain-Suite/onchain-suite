"use client";

import { useMemo } from "react";

import { useActiveSection } from "@/onchain-suite-website/hooks/use-active-section";
import type { MapEntry } from "@/onchain-suite-website/utils/playbook-toc";

/**
 * Which rail entry is current. A fixed id when the rail lists pages (the
 * landing page); otherwise the section being read, following the scroll, and
 * the opening until the first section is reached.
 */
export function useRailCurrent(
  entries: MapEntry[],
  fixedId?: string
): string | null {
  const ids = useMemo(
    () => (fixedId ? [] : entries.map((e) => e.id)),
    [entries, fixedId]
  );
  const active = useActiveSection(ids);
  return fixedId ?? active ?? entries[0]?.id ?? null;
}
