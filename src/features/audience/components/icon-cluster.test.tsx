import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AppIconCluster,
  ChainIconCluster,
  TokenIconCluster,
} from "./icon-cluster";

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

describe("AppIconCluster", () => {
  it("renders curated protocol chips with brand tickers", () => {
    render(<AppIconCluster protocols={["aave_v3", "uniswap_v3"]} />);
    expect(screen.getByText("AAVE")).toBeInTheDocument();
    expect(screen.getByText("UNI")).toBeInTheDocument();
  });

  it("collapses a protocol's markets to one chip (aave_v2 + aave_v3)", () => {
    render(<AppIconCluster protocols={["aave_v2", "aave_v3"]} />);
    expect(screen.getAllByText("AAVE")).toHaveLength(1);
  });

  it("labels the cluster with the Uses verb", () => {
    render(<AppIconCluster protocols={["aave_v3", "uniswap_v3"]} />);
    expect(screen.getByLabelText("Uses Aave, Uniswap")).toBeInTheDocument();
  });

  it("renders a dash when the wallet uses no protocols", () => {
    render(<AppIconCluster protocols={[]} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});

describe("TokenIconCluster", () => {
  it("shows a token logo image when present, with the symbol as alt", () => {
    render(
      <TokenIconCluster
        tokens={[
          { symbol: "USDC", name: "USD Coin", logoUrl: "https://l/usdc.png" },
        ]}
      />
    );
    const img = screen.getByAltText("USDC");
    expect(img).toHaveAttribute("src", "https://l/usdc.png");
  });

  it("falls back to the ticker initials chip when there is no logo", () => {
    render(
      <TokenIconCluster
        tokens={[{ symbol: "WETH", name: "Wrapped Ether", logoUrl: null }]}
      />
    );
    expect(screen.getByText("WETH")).toBeInTheDocument();
  });

  it("labels the cluster with the Holds verb, preferring symbol then name", () => {
    render(
      <TokenIconCluster
        tokens={[
          { symbol: "ETH", name: null, logoUrl: null },
          { symbol: null, name: "Dai Stablecoin", logoUrl: null },
        ]}
      />
    );
    expect(
      screen.getByLabelText("Holds ETH, Dai Stablecoin")
    ).toBeInTheDocument();
  });

  it("renders a dash when the wallet holds no tokens", () => {
    render(<TokenIconCluster tokens={[]} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
