"use client";

import { useMemo } from "react";

import type {
  ManualContractDraft,
  OnboardingContract,
  ProjectProfile,
} from "../constants/guided";

/**
 * The one contract onboarding hands the indexer: the by-hand one if given,
 * otherwise the pasted address on the chain beside it. That chain is set by
 * whichever step last looked the address up (or by the person, by hand) and is
 * cleared when an address is found on no chain, so an address with no chain is
 * not indexed: guessing one would start a job against a contract that is not
 * there. Empty when there is nothing to index.
 */
export function useOnboardingContracts(
  profile: ProjectProfile,
  manual: ManualContractDraft | null
): OnboardingContract[] {
  return useMemo((): OnboardingContract[] => {
    // Only a team that starts from a smart contract gets the contract step,
    // so nothing entered before switching to another answer is indexed.
    if (profile.start !== "chain") return [];
    const [chain] = profile.chains;
    const manualAddr = manual?.address.trim() ?? "";
    if (manualAddr) {
      // The by-hand form always carries the chain it shows.
      const manualChain = manual?.chain.trim() ? manual.chain.trim() : chain;
      if (!manualChain) return [];
      const name = manual?.name.trim() ? manual.name.trim() : undefined;
      return [{ address: manualAddr, chain: manualChain, name }];
    }
    const typedAddr = profile.contract.trim();
    if (typedAddr && chain) return [{ address: typedAddr, chain }];
    return [];
  }, [profile.start, profile.contract, profile.chains, manual]);
}
