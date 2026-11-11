import { describe, expect, it, vi } from "vitest";

import {
  normalizeChainRequest,
  normalizeResolvedContract,
} from "./onboarding.service";

vi.mock("@/lib/api-client", () => ({ apiClient: { request: vi.fn() } }));

const ADDR = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";

describe("normalizeResolvedContract", () => {
  it("reads a found contract, with the other chains it is on", () => {
    const out = normalizeResolvedContract(
      {
        success: true,
        data: {
          found: true,
          address: ADDR,
          chain: "base-mainnet",
          chainLabel: "Base",
          standard: "erc20",
          kind: "token",
          name: "Uniswap",
          symbol: "UNI",
          decimals: 18,
          logo: null,
          alsoOn: [
            { chain: "arb-mainnet", chainLabel: "Arbitrum" },
            { chain: "opt-mainnet" },
            { nope: true },
          ],
        },
      },
      ADDR
    );
    expect(out).toMatchObject({
      found: true,
      chain: "base-mainnet",
      chainLabel: "Base",
      standard: "erc20",
      name: "Uniswap",
    });
    expect(out.found && out.alsoOn).toEqual([
      { chain: "arb-mainnet", chainLabel: "Arbitrum" },
      // A chain with no label is still offered, by its key.
      { chain: "opt-mainnet", chainLabel: "opt-mainnet" },
    ]);
  });

  it("reads an older answer with no alsoOn as being on one chain", () => {
    const out = normalizeResolvedContract(
      {
        found: true,
        address: ADDR,
        chain: "eth-mainnet",
        chainLabel: "Ethereum",
      },
      ADDR
    );
    expect(out.found && out.alsoOn).toEqual([]);
  });

  it("keeps where it looked, and where it could not, on a miss", () => {
    expect(
      normalizeResolvedContract(
        {
          found: false,
          address: ADDR,
          reason: "no-code",
          chainsTried: ["Ethereum", "Base", 7],
          chainsUnreachable: ["Linea"],
        },
        ADDR
      )
    ).toEqual({
      found: false,
      address: ADDR,
      reason: "no-code",
      chainsTried: ["Ethereum", "Base"],
      chainsUnreachable: ["Linea"],
    });
  });

  it("degrades anything malformed to an error, never to a found contract", () => {
    expect(normalizeResolvedContract(null, ADDR)).toMatchObject({
      found: false,
      address: ADDR,
      reason: "error",
    });
    expect(
      normalizeResolvedContract({ found: "yes", reason: "weird" }, ADDR)
    ).toMatchObject({ found: false, reason: "error" });
  });
});

describe("normalizeChainRequest", () => {
  it("reads a recorded ask, in the words the server kept", () => {
    expect(
      normalizeChainRequest(
        {
          success: true,
          data: { recorded: true, request: { chain: "Berachain" } },
        },
        " berachain "
      )
    ).toEqual({ recorded: true, chain: "Berachain" });
  });

  it("hands back the chain when it is one we already index", () => {
    expect(
      normalizeChainRequest(
        {
          recorded: false,
          supported: { chain: "base-mainnet", chainLabel: "Base" },
        },
        "base"
      )
    ).toEqual({
      recorded: false,
      supported: { chain: "base-mainnet", chainLabel: "Base" },
    });
  });

  it("treats a bare success as recorded, under what was asked", () => {
    expect(normalizeChainRequest({}, "Sonic")).toEqual({
      recorded: true,
      chain: "Sonic",
    });
    // "Not recorded" with no chain to use instead cannot be acted on.
    expect(normalizeChainRequest({ recorded: false }, "Sonic")).toEqual({
      recorded: true,
      chain: "Sonic",
    });
  });
});
