import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EMPTY_PROFILE } from "../constants/guided";
import { useOnboardingContracts } from "./use-onboarding-contracts";

const manual = {
  name: "Vault",
  address: "0xabc",
  chain: "base",
  type: "erc20",
};

describe("useOnboardingContracts", () => {
  it("indexes the contract a contract team gave", () => {
    const { result } = renderHook(() =>
      useOnboardingContracts({ ...EMPTY_PROFILE, start: "chain" }, null, manual)
    );
    expect(result.current).toEqual([
      { address: "0xabc", chain: "base", name: "Vault" },
    ]);
  });

  it("indexes nothing once the start answer is no longer a contract", () => {
    const { result } = renderHook(() =>
      useOnboardingContracts(
        { ...EMPTY_PROFILE, start: "site", contract: "0xdef" },
        "base",
        manual
      )
    );
    expect(result.current).toEqual([]);
  });
});
