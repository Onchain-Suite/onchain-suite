"use client";

import { CubeTransparentIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { projectSettingsService } from "../project-settings.service";
import { useAccountOrg } from "./account/use-account-org";

/** Contracts card within the Account tab (scroll-anchored). */
export const SETTINGS_CONTRACTS_HREF =
  "/settings?tab=account&section=contracts";

export type ContractNudgeContext = "intelligence" | "automation";

const COPY: Record<ContractNudgeContext, { title: string; body: string }> = {
  intelligence: {
    title: "Add a contract address to enrich your data",
    body: "MCP and SQL queries return real onchain metrics once we've indexed your protocol's contracts and enriched the holder wallets.",
  },
  automation: {
    title: "Add a contract address for onchain triggers",
    body: "Onchain triggers fire from wallet activity we enrich off your protocol's contracts. Add at least one so these steps have data to run on.",
  },
};

/**
 * Nudge shown in the enrichment-dependent surfaces (Intelligence MCP/SQL and the
 * automation builder) when the org has no saved contract addresses. Enrichment
 * seeds `user_onchain_metrics` from project-settings contracts, so without one
 * MCP/SQL return empty and onchain automation triggers have nothing to fire on.
 *
 * Self-fetches by default (its own cache key). When the host already holds the
 * project-settings, pass `hasContracts` to skip the extra request.
 */
export function ContractAddressNudge({
  context,
  hasContracts,
  className,
}: {
  context: ContractNudgeContext;
  hasContracts?: boolean;
  className?: string;
}) {
  const provided = typeof hasContracts === "boolean";
  const { organizationId } = useAccountOrg();

  const query = useQuery({
    queryKey: ["contract-nudge", "project-settings", organizationId],
    enabled: !provided && Boolean(organizationId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    queryFn: () =>
      projectSettingsService.getProjectSettings(organizationId ?? undefined),
  });

  const resolvedHasContracts = provided
    ? hasContracts
    : (query.data?.contractAddresses?.length ?? 0) > 0;
  const loading = provided ? false : query.isLoading;

  // Never nag while loading or once at least one contract is saved.
  if (loading || resolvedHasContracts) return null;

  const copy = COPY[context];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4",
        className
      )}
    >
      <CubeTransparentIcon
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{copy.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {copy.body}
        </p>
      </div>
      <Link
        href={SETTINGS_CONTRACTS_HREF}
        className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/30 dark:text-amber-300"
      >
        Add contract
      </Link>
    </div>
  );
}

export default ContractAddressNudge;
