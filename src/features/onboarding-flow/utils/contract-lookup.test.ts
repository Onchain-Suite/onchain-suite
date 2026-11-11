import { describe, expect, it } from "vitest";

import type { ResolvedContractFound } from "../contracts/resolve-contract";
import {
  chainList,
  describeContract,
  isElsewhere,
  lookupState,
  markElsewhere,
  toAddress,
} from "./contract-lookup";

const ADDR = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

const found = (
  over: Partial<ResolvedContractFound> = {}
): ResolvedContractFound => ({
  found: true,
  address: ADDR.toLowerCase(),
  chain: "base-mainnet",
  chainLabel: "Base",
  standard: "erc20",
  kind: "token",
  name: "Uniswap",
  symbol: "UNI",
  decimals: 18,
  logo: null,
  verifiedOnChain: true,
  alsoOn: [],
  ...over,
});

const state = (
  over: Partial<Parameters<typeof lookupState>[0]> = {}
): ReturnType<typeof lookupState> =>
  lookupState({
    raw: ADDR,
    isLooking: false,
    isError: false,
    result: undefined,
    ...over,
  });

describe("toAddress", () => {
  it("accepts a 0x address in any case, trimmed and lower-cased", () => {
    expect(toAddress(`  ${ADDR} `)).toBe(ADDR.toLowerCase());
  });

  it("rejects anything else", () => {
    expect(toAddress("0x123")).toBeNull();
    expect(toAddress("maya.eth")).toBeNull();
    expect(toAddress("")).toBeNull();
  });
});

describe("lookupState", () => {
  it("has nothing to say about an empty field", () => {
    expect(state({ raw: "  " })).toEqual({ kind: "idle" });
  });

  it("flags what is not an address before looking anywhere", () => {
    expect(state({ raw: "0x12", isLooking: true })).toEqual({
      kind: "invalid",
    });
  });

  it("is looking until an answer arrives", () => {
    expect(state({ isLooking: true })).toEqual({ kind: "looking" });
    expect(state()).toEqual({ kind: "looking" });
  });

  it("reports the contract it found", () => {
    const contract = found();
    expect(state({ result: contract })).toEqual({ kind: "found", contract });
  });

  it("says how many chains it looked on when the address is on none", () => {
    expect(
      state({
        result: {
          found: false,
          address: ADDR,
          reason: "no-code",
          chainsTried: ["Ethereum", "Base", "Arbitrum"],
          chainsUnreachable: ["Linea"],
        },
      })
    ).toEqual({ kind: "nowhere", tried: 3, unreachable: ["Linea"] });
  });

  it("does not claim 'not found' when nothing could be checked", () => {
    expect(state({ isError: true })).toEqual({ kind: "unknown" });
    expect(
      state({ result: { found: false, address: ADDR, reason: "error" } })
    ).toEqual({ kind: "unknown" });
  });

  it("tells an unreadable chain apart from a missing contract", () => {
    expect(
      state({ result: { found: false, address: ADDR, reason: "no-chain" } })
    ).toEqual({ kind: "unreadable-chain" });
  });
});

describe("describeContract", () => {
  it("names a token with its symbol and chain", () => {
    expect(describeContract(found())).toBe("Uniswap (UNI), a token on Base");
  });

  it("uses whichever of name and symbol it has", () => {
    expect(describeContract(found({ name: null }))).toBe(
      "UNI, a token on Base"
    );
    expect(describeContract(found({ name: "UNI" }))).toBe(
      "UNI, a token on Base"
    );
  });

  it("gets the article right for an NFT collection", () => {
    expect(
      describeContract(
        found({ standard: "erc721", name: "Packs", symbol: null })
      )
    ).toBe("Packs, an NFT collection on Base");
  });

  it("still says where a nameless contract lives", () => {
    expect(
      describeContract(found({ standard: "unknown", name: null, symbol: null }))
    ).toBe("A contract on Base");
    expect(
      describeContract(found({ standard: "erc1155", name: null, symbol: null }))
    ).toBe("An NFT collection on Base");
  });
});

describe("chainList", () => {
  it("joins a short list in words", () => {
    expect(chainList([])).toBe("");
    expect(chainList(["Base"])).toBe("Base");
    expect(chainList(["Ethereum", "Base"])).toBe("Ethereum and Base");
    expect(chainList(["Ethereum", "Base", "Arbitrum"])).toBe(
      "Ethereum, Base and Arbitrum"
    );
  });

  it("counts the rest of a long one", () => {
    expect(chainList(["Ethereum", "Base", "Arbitrum", "Optimism"])).toBe(
      "Ethereum, Base and 2 more"
    );
  });
});

describe("the 'it is on another chain' memory", () => {
  it("holds for the address it was said about, in any case, and no other", () => {
    window.sessionStorage.clear();
    expect(isElsewhere(ADDR)).toBe(false);

    markElsewhere(ADDR.toLowerCase());
    expect(isElsewhere(ADDR)).toBe(true);
    expect(isElsewhere(`  ${ADDR.toLowerCase()} `)).toBe(true);
    expect(isElsewhere("0x000000000000000000000000000000000000dead")).toBe(
      false
    );
    expect(isElsewhere("acme.xyz")).toBe(false);

    markElsewhere(null);
    expect(isElsewhere(ADDR)).toBe(false);
  });
});
