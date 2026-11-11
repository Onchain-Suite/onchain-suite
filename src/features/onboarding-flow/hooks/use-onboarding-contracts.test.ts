import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EMPTY_PROFILE, type ProjectProfile } from "../constants/guided";
import { useOnboardingContracts } from "./use-onboarding-contracts";

const manual = {
  name: "Vault",
  address: "0xabc",
  chain: "base",
  type: "erc20",
};

const contracts = (
  profile: Partial<ProjectProfile>,
  byHand: typeof manual | null = null
) =>
  renderHook(() =>
    useOnboardingContracts(
      { ...EMPTY_PROFILE, start: "chain", ...profile },
      byHand
    )
  ).result.current;

describe("useOnboardingContracts", () => {
  it("indexes the contract a contract team gave by hand", () => {
    expect(contracts({}, manual)).toEqual([
      { address: "0xabc", chain: "base", name: "Vault" },
    ]);
  });

  it("indexes nothing once the start answer is no longer a contract", () => {
    expect(
      contracts({ start: "site", contract: "0xdef", chains: ["base"] }, manual)
    ).toEqual([]);
  });

  it("indexes a pasted address on the chain beside it", () => {
    expect(contracts({ contract: "0xdef", chains: ["base-mainnet"] })).toEqual([
      { address: "0xdef", chain: "base-mainnet" },
    ]);
  });

  // It used to be handed to the indexer on Ethereum regardless, and after
  // that on the chain of whichever address it replaced.
  it("indexes nothing for an address with no chain", () => {
    expect(contracts({ contract: "0xdef", chains: [] })).toEqual([]);
  });

  it("does not index a by-hand contract under a guessed chain", () => {
    expect(contracts({}, { ...manual, chain: "" })).toEqual([]);
    // The project's chain stands in when the form has none of its own.
    expect(
      contracts({ chains: ["arb-mainnet"] }, { ...manual, chain: " " })
    ).toEqual([{ address: "0xabc", chain: "arb-mainnet", name: "Vault" }]);
  });
});
