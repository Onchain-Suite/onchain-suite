import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContractManualEntry } from "./contract-manual-entry";

vi.mock("../../hooks/use-supported-chains", () => ({
  useSupportedChains: () => [
    { key: "arb-mainnet", label: "Arbitrum" },
    { key: "base-mainnet", label: "Base" },
    { key: "eth-mainnet", label: "Ethereum" },
  ],
}));

const draft = { name: "", address: "", chain: "", type: "erc20" };

const renderEntry = (chains: string[], chain = "") => {
  const onChange = vi.fn();
  render(
    <ContractManualEntry
      draft={{ ...draft, chain }}
      onChange={onChange}
      chains={chains}
      onBack={vi.fn()}
    />
  );
  return onChange;
};

// The picker cannot show "no chain". It showed the first option while the
// draft held none, and the contract was then indexed on Ethereum.
describe("ContractManualEntry", () => {
  it("gives a draft with no chain the project's chain, which it shows", () => {
    const onChange = renderEntry(["base-mainnet"]);
    expect(onChange).toHaveBeenCalledWith({ ...draft, chain: "base-mainnet" });
  });

  it("falls back to Ethereum, not to whichever chain happens to be first", () => {
    const onChange = renderEntry([]);
    expect(onChange).toHaveBeenCalledWith({ ...draft, chain: "eth-mainnet" });
  });

  it("leaves a chain that was already chosen alone", () => {
    const onChange = renderEntry(["base-mainnet"], "arb-mainnet");
    expect(onChange).not.toHaveBeenCalled();
  });
});
