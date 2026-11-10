"use client";

import { useMemo } from "react";

import type {
  ManualContractDraft,
  OnboardingContract,
  ProjectProfile,
} from "../constants/guided";
import { DEFAULT_CHAIN } from "../data/chains";

/**
 * The one contract onboarding hands the indexer: the by-hand one if given,
 * otherwise the address pasted on the contract step, on the resolver's or the
 * chosen chain. Empty when there is none.
 */
export function useOnboardingContracts(
  profile: ProjectProfile,
  resolvedChain: string | null,
  manual: ManualContractDraft | null
): OnboardingContract[] {
  return useMemo((): OnboardingContract[] => {
    // Only a team that starts from a smart contract gets the contract step,
    // so nothing entered before switching to another answer is indexed.
    if (profile.start !== "chain") return [];
    const manualAddr = manual?.address.trim() ?? "";
    const typedAddr = profile.contract.trim();
    const manualChain =
      [manual?.chain, resolvedChain, profile.chains[0]].find(
        (c): c is string => typeof c === "string" && c.trim().length > 0
      ) ?? DEFAULT_CHAIN;
    const manualName = manual?.name.trim() ? manual.name.trim() : undefined;
    if (manualAddr) {
      return [{ address: manualAddr, chain: manualChain, name: manualName }];
    }
    if (typedAddr) {
      return [
        {
          address: typedAddr,
          chain: resolvedChain ?? profile.chains[0] ?? DEFAULT_CHAIN,
        },
      ];
    }
    return [];
  }, [profile.start, profile.contract, profile.chains, resolvedChain, manual]);
}
