"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { getSelectedOrganizationId } from "@/lib/utils";

import { GROUP_ICON } from "./palette-data";
import {
  contactRow,
  itemsOf,
  namedItems,
  type PaletteRow,
  PER_GROUP,
  statusLabel,
} from "./palette-model";
import { aiSearchService } from "@/features/ai-search/ai-search.service";
import { audienceService } from "@/features/audience/audience.service";
import { automationService } from "@/features/automation/automation.service";
import { campaignsService } from "@/features/campaigns/campaigns.service";
import { formsService } from "@/features/forms/forms.service";

/** Typing pause before the server searches run. */
const DEBOUNCE_MS = 250;
/** Shortest query worth a server round trip. */
const MIN_SERVER_QUERY = 2;
/** Content search is the costliest; it waits for a little more to go on. */
const MIN_CONTENT_QUERY = 3;
/** Campaigns and forms have no search endpoint: one capped page, filtered here. */
const CLIENT_LIST_LIMIT = 100;

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Every record ⌘K can find, for one query. Contacts, Loops and segments are
 * searched by the server (it sees fields we do not); campaigns and forms are
 * one cached page filtered by the palette. Nothing runs while the palette is
 * closed, every search fails quietly (that group is just absent), and none
 * refetches on focus.
 */
export function usePaletteRecords(open: boolean, rawQuery: string) {
  const query = useDebounced(rawQuery.trim(), DEBOUNCE_MS);
  const org = getSelectedOrganizationId() ?? "";
  const serverSearch = open && query.length >= MIN_SERVER_QUERY;
  const common = { retry: false, staleTime: 30_000 } as const;

  const contacts = useQuery({
    ...common,
    queryKey: ["palette", org, "contacts", query],
    enabled: serverSearch,
    queryFn: ({ signal }) =>
      audienceService.listProfiles({ q: query, limit: PER_GROUP }, undefined, {
        signal,
      }),
  });

  const loops = useQuery({
    ...common,
    queryKey: ["palette", org, "loops", query],
    enabled: serverSearch,
    queryFn: () =>
      automationService.searchAutomations({ q: query, limit: PER_GROUP }),
  });

  const segments = useQuery({
    ...common,
    queryKey: ["palette", org, "segments", query],
    enabled: serverSearch,
    queryFn: () => audienceService.listSegments({ q: query, limit: PER_GROUP }),
  });

  const content = useQuery({
    ...common,
    queryKey: ["palette", org, "content", query],
    enabled: open && query.length >= MIN_CONTENT_QUERY,
    queryFn: () => aiSearchService.search(query, PER_GROUP),
  });

  // Loaded once per open palette and reused for every keystroke.
  const campaigns = useQuery({
    retry: false,
    staleTime: 60_000,
    queryKey: ["palette", org, "campaigns"],
    enabled: open,
    queryFn: () => campaignsService.listCampaigns({ limit: CLIENT_LIST_LIMIT }),
  });

  const forms = useQuery({
    retry: false,
    staleTime: 60_000,
    queryKey: ["palette", org, "forms"],
    enabled: open,
    queryFn: () => formsService.listForms(),
  });

  const records = useMemo((): PaletteRow[] => {
    if (!query) return [];
    const rows: PaletteRow[] = [];

    for (const profile of itemsOf(contacts.data)) {
      const row = contactRow(profile);
      if (row) rows.push(row);
    }
    for (const c of campaigns.data ?? []) {
      rows.push({
        key: `campaign:${c.id}`,
        group: "Campaigns",
        title: c.name || "Untitled campaign",
        sub: `Campaign · ${statusLabel(String(c.status ?? ""))}`,
        icon: GROUP_ICON.Campaigns,
        href: `/campaigns/${encodeURIComponent(c.id)}`,
        record: true,
      });
    }
    for (const l of namedItems(loops.data)) {
      rows.push({
        key: `loop:${l.id}`,
        group: "Loops",
        title: l.name,
        sub: `Loop · ${statusLabel(l.status)}`,
        icon: GROUP_ICON.Loops,
        href: `/automations/${encodeURIComponent(l.id)}`,
        record: true,
        serverMatched: true,
      });
    }
    for (const f of forms.data ?? []) {
      rows.push({
        key: `form:${f.id}`,
        group: "Forms",
        title: f.name,
        sub: `Form · ${statusLabel(f.status)}`,
        icon: GROUP_ICON.Forms,
        href: `/forms/${encodeURIComponent(f.id)}`,
        record: true,
      });
    }
    for (const s of segments.data ?? []) {
      rows.push({
        key: `segment:${s.id}`,
        group: "Segments",
        title: s.name,
        sub:
          typeof s.count === "number"
            ? `Segment · ${s.count.toLocaleString()} people`
            : "Segment",
        icon: GROUP_ICON.Segments,
        href: `/intelligence/segments/detail/${encodeURIComponent(s.id)}`,
        record: true,
        serverMatched: true,
      });
    }
    // Content hits rarely contain the query in their title, so they are kept
    // as server matches. Only in-app links: the palette never opens a new tab.
    for (const [i, hit] of (content.data ?? []).entries()) {
      if (!hit.sourceUri.startsWith("/")) continue;
      rows.push({
        key: `content:${i}:${hit.sourceUri}`,
        group: "From your workspace",
        title: hit.title,
        sub: hit.snippet,
        icon: GROUP_ICON["From your workspace"],
        href: hit.sourceUri,
        serverMatched: true,
      });
    }
    return rows;
  }, [
    query,
    contacts.data,
    campaigns.data,
    loops.data,
    forms.data,
    segments.data,
    content.data,
  ]);

  const searching =
    rawQuery.trim() !== query ||
    contacts.isFetching ||
    loops.isFetching ||
    segments.isFetching;

  return { query, records, searching };
}
