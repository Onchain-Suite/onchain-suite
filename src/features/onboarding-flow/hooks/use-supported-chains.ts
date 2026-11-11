"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { isJsonObject } from "@/lib/utils";

import { SUPPORTED_CHAINS, type SupportedChain } from "../data/chains";

const LOGO_BY_KEY = new Map(SUPPORTED_CHAINS.map((c) => [c.key, c.logo]));

/**
 * The chains the backend indexes, out of `GET /chains`.
 *
 * It answers `{ chains: [{ slug, label, family, testnet, ... }] }`. (An earlier
 * version of this read a bare array with a `key` field, matched nothing, and
 * silently served the seven-chain fallback as if it were the whole list.)
 * Testnets are left out: nobody onboards a production audience from one. We
 * keep our own logo for a chain we recognise, since the backend does not know
 * our ChainLogo set. Anything unusable falls back to the static list, so the
 * pickers never break.
 */
export function toSupportedChains(payload: unknown): SupportedChain[] {
  const root =
    isJsonObject(payload) && "data" in payload ? payload.data : payload;
  const rows = Array.isArray(root)
    ? root
    : isJsonObject(root) && Array.isArray(root.chains)
      ? root.chains
      : [];

  const chains = rows.flatMap((row): SupportedChain[] => {
    if (!isJsonObject(row) || row.testnet === true) return [];
    const key =
      typeof row.slug === "string"
        ? row.slug
        : typeof row.key === "string"
          ? row.key
          : "";
    const label =
      typeof row.label === "string"
        ? row.label
        : typeof row.name === "string"
          ? row.name
          : "";
    if (!key || !label) return [];
    return [{ key, label, logo: LOGO_BY_KEY.get(key) }];
  });

  return chains.length > 0 ? chains : SUPPORTED_CHAINS;
}

async function fetchSupportedChains(): Promise<SupportedChain[]> {
  // Silent: any failure just falls back to the static list, so it must not
  // log an error.
  const res = await apiClient.get("/chains", {
    headers: { "x-onchain-silent-error": "1" },
  });
  return toSupportedChains(res.data as unknown);
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
