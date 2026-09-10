import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AppIconCluster,
  ChainIconCluster,
  TokenIconCluster,
} from "./icon-cluster";

describe("ChainIconCluster", () => {
  it("renders our Cloudinary logo first for a chain (alt = label)", () => {
    render(<ChainIconCluster chains={["eth-mainnet"]} />);
    const img = screen.getByAltText("Ethereum");
    expect(img).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/dwnkqkx8q/image/upload/onchain/chains/ethereum.svg"
    );
  });

  it("collapses chains that resolve to the same label", () => {
    // "eth" and "eth-mainnet" are both Ethereum — one chip, not two.
    render(<ChainIconCluster chains={["eth", "eth-mainnet"]} />);
    expect(screen.getAllByAltText("Ethereum")).toHaveLength(1);
  });

  it("still attempts a Cloudinary logo for an uncurated chain (extensible by upload)", () => {
    render(<ChainIconCluster chains={["zksync-era"]} />);
    const img = screen.getByAltText("Zksync Era");
    expect(img).toHaveAttribute(
      "src",
      expect.stringContaining("zksync-era.svg")
    );
  });

  it("cascades Cloudinary → DefiLlama → ticker chip as sources fail", () => {
    render(<ChainIconCluster chains={["eth-mainnet"]} />);
    const img = screen.getByAltText("Ethereum");
    expect(img).toHaveAttribute("src", expect.stringContaining("cloudinary"));
    fireEvent.error(img); // Cloudinary miss → DefiLlama
    expect(screen.getByAltText("Ethereum")).toHaveAttribute(
      "src",
      expect.stringContaining("llamao.fi")
    );
    fireEvent.error(screen.getByAltText("Ethereum")); // DefiLlama miss → ticker
    expect(screen.getByText("ETH")).toBeInTheDocument();
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
  it("renders a real logo per curated protocol (alt = label)", () => {
    render(<AppIconCluster protocols={["aave_v3", "uniswap_v3"]} />);
    expect(screen.getByAltText("Aave")).toBeInTheDocument();
    expect(screen.getByAltText("Uniswap")).toBeInTheDocument();
  });

  it("collapses a protocol's markets to one chip (aave_v2 + aave_v3)", () => {
    render(<AppIconCluster protocols={["aave_v2", "aave_v3"]} />);
    expect(screen.getAllByAltText("Aave")).toHaveLength(1);
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
          {
            symbol: "USDC",
            name: "USD Coin",
            logoUrl: "https://l/usdc.png",
            chain: "eth-mainnet",
          },
        ]}
      />
    );
    const img = screen.getByAltText("USDC");
    expect(img).toHaveAttribute("src", "https://l/usdc.png");
  });

  it("falls a logo-less token back to its chain icon (WETH → Ethereum)", () => {
    render(
      <TokenIconCluster
        tokens={[
          {
            symbol: "WETH",
            name: "Wrapped Ether",
            logoUrl: null,
            chain: "eth-mainnet",
          },
        ]}
      />
    );
    // No token logo, so the first source is its chain's Cloudinary icon.
    const img = screen.getByAltText("WETH");
    expect(img).toHaveAttribute(
      "src",
      expect.stringContaining("onchain/chains/ethereum.svg")
    );
  });

  it("falls back to the ticker chip only when there's no logo and no chain", () => {
    render(
      <TokenIconCluster
        tokens={[{ symbol: "FOO", name: "Foo", logoUrl: null, chain: null }]}
      />
    );
    expect(screen.getByText("FOO")).toBeInTheDocument();
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
