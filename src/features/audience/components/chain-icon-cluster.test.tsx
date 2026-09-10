import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChainIconCluster } from "./chain-icon-cluster";

describe("ChainIconCluster", () => {
  it("renders one chip per distinct chain with curated tickers", () => {
    render(<ChainIconCluster chains={["eth-mainnet", "base-mainnet"]} />);
    expect(screen.getByText("ETH")).toBeInTheDocument();
    expect(screen.getByText("BASE")).toBeInTheDocument();
  });

  it("collapses chains that resolve to the same label", () => {
    // "eth" and "eth-mainnet" are both Ethereum — one chip, not two.
    render(<ChainIconCluster chains={["eth", "eth-mainnet"]} />);
    expect(screen.getAllByText("ETH")).toHaveLength(1);
  });

  it("shows a +N overflow chip past the max", () => {
    render(
      <ChainIconCluster
        max={2}
        chains={["eth", "base", "arbitrum", "optimism"]}
      />
    );
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("renders a dash when the wallet has no on-chain activity", () => {
    render(<ChainIconCluster chains={[]} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("labels the cluster for screen readers", () => {
    render(<ChainIconCluster chains={["eth-mainnet", "solana-mainnet"]} />);
    expect(
      screen.getByLabelText("Active on Ethereum, Solana")
    ).toBeInTheDocument();
  });
});
