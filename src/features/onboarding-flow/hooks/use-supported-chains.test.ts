import { describe, expect, it, vi } from "vitest";

import { SUPPORTED_CHAINS } from "../data/chains";
import { toSupportedChains } from "./use-supported-chains";

vi.mock("@/lib/api-client", () => ({ apiClient: { get: vi.fn() } }));

const chain = (over: Record<string, unknown>) => ({
  slug: "base-mainnet",
  label: "Base",
  family: "evm",
  testnet: false,
  ...over,
});

describe("toSupportedChains", () => {
  it("reads the backend's { chains } answer, inside its envelope", () => {
    const out = toSupportedChains({
      success: true,
      data: {
        chains: [
          chain({}),
          chain({ slug: "berachain-mainnet", label: "Berachain" }),
        ],
      },
    });
    expect(out.map((c) => c.key)).toEqual([
      "base-mainnet",
      "berachain-mainnet",
    ]);
    // A chain we have a mark for keeps it; one we do not simply has none.
    expect(out[0].logo).toBe("base");
    expect(out[1].logo).toBeUndefined();
  });

  it("leaves testnets out", () => {
    const out = toSupportedChains({
      chains: [chain({}), chain({ slug: "base-sepolia", testnet: true })],
    });
    expect(out.map((c) => c.key)).toEqual(["base-mainnet"]);
  });

  it("still reads a bare array with the older key and name fields", () => {
    const out = toSupportedChains([{ key: "eth-mainnet", name: "Ethereum" }]);
    expect(out).toEqual([
      { key: "eth-mainnet", label: "Ethereum", logo: "ethereum" },
    ]);
  });

  it("falls back to the static list when nothing usable comes back", () => {
    expect(toSupportedChains(null)).toBe(SUPPORTED_CHAINS);
    expect(toSupportedChains({ chains: [] })).toBe(SUPPORTED_CHAINS);
    expect(toSupportedChains({ chains: [{ slug: "x" }] })).toBe(
      SUPPORTED_CHAINS
    );
  });
});
