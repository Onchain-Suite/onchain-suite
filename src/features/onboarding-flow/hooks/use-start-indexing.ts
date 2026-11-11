"use client";

import { useCallback } from "react";

import type { OnboardingContract } from "../constants/guided";
import { onboardingService } from "../onboarding.service";
import {
  contractsKey,
  readStartedKey,
  shouldStartIndexing,
  writeStartedKey,
} from "../utils/indexing-start";

/**
 * Start the first historical indexing for the workspace's contract, once.
 *
 * Goes through the `connect-chain` task, which also marks that card done on
 * Home. Call it wherever the contract may have just become known; a contract
 * it already started is skipped, including after a reload. If the request
 * fails it is forgotten again, so the next call (finishing, at the latest)
 * tries once more. Resolves either way and never throws: indexing must not
 * hold up or break the step someone is on. Needs the workspace to exist.
 */
export function useStartIndexing(): (
  contracts: OnboardingContract[],
  orgId?: string
) => Promise<void> {
  return useCallback(async (contracts, orgId) => {
    if (!shouldStartIndexing(contracts, readStartedKey())) return;
    const key = contractsKey(contracts);
    // Marked before the request, so a second call while it is in flight
    // (two steps left in quick succession) does not start a second job.
    writeStartedKey(key);
    try {
      await onboardingService.completeTask(
        "connect-chain",
        {
          contracts: contracts.map((c) => ({
            address: c.address,
            chain: c.chain,
            name: c.name,
          })),
          lookbackDays: 90,
        },
        orgId
      );
    } catch (error) {
      if (readStartedKey() === key) writeStartedKey(null);
      console.warn("Failed to start contract indexing:", error);
    }
  }, []);
}
