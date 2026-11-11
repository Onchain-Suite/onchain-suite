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
 * otherwise the pasted address on the chain it was found on (the contract
 * step) or the chain set beside it (the project step). Empty when there is
 * none, or when the address was found on no chain.
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
    // A pasted address is indexed on the chain it was found on. One that was
    // found nowhere is not indexed at all: guessing a chain for it would start
    // a job against a contract that is not there.
    const typedChain = resolvedChain ?? profile.chains[0];
    if (typedAddr && typedChain) {
      return [{ address: typedAddr, chain: typedChain }];
    }
    return [];
  }, [profile.start, profile.contract, profile.chains, resolvedChain, manual]);
}
