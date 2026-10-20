"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { isJsonObject } from "@/lib/utils";

import { SUPPORTED_CHAINS, type SupportedChain } from "../data/chains";

/**
 * The supported chains, from the backend when available.
 *
 * The long-term source of truth is `GET /chains`; until it ships (or if it fails) this falls back
 * to the static {@link SUPPORTED_CHAINS} list, so the pickers never break. We keep our own logo for
 * a chain the backend returns when we recognise its key (the backend does not know our ChainLogo
 * set). See docs/onboarding-v2-backend-handoff.md.
 */
async function fetchSupportedChains(): Promise<SupportedChain[]> {
  const res = await apiClient.get("/chains");
  const payload: unknown = res.data;
  const root =
    isJsonObject(payload) && "data" in payload ? payload.data : payload;
  const rows = Array.isArray(root) ? root : [];

  const logoByKey = new Map(SUPPORTED_CHAINS.map((c) => [c.key, c.logo]));
  const chains = rows
    .map((row): SupportedChain | null => {
      if (!isJsonObject(row)) return null;
      const key = typeof row.key === "string" ? row.key : undefined;
      const label =
        typeof row.label === "string"
          ? row.label
          : typeof row.name === "string"
            ? row.name
            : undefined;
      if (!key || !label) return null;
      return { key, label, logo: logoByKey.get(key) };
    })
    .filter((c): c is SupportedChain => c !== null);

  return chains.length > 0 ? chains : SUPPORTED_CHAINS;
}

/** Returns the supported chains, defaulting to the static list on first render / on error. */
export function useSupportedChains(): SupportedChain[] {
  const { data } = useQuery({
    queryKey: ["chains", "supported"],
    queryFn: fetchSupportedChains,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  return data ?? SUPPORTED_CHAINS;
}
