import { describe, expect, it } from "vitest";

import { sectorGroupOf } from "./sector";

describe("sectorGroupOf", () => {
  it("classifies known Web3 sectors", () => {
    expect(sectorGroupOf("DeFi Protocol")).toBe("web3");
    expect(sectorGroupOf("NFT Marketplace or Project")).toBe("web3");
  });

  it("classifies known Web2 sectors", () => {
    expect(sectorGroupOf("SaaS or Software")).toBe("web2");
    expect(sectorGroupOf("E-commerce or Retail")).toBe("web2");
  });

  it("treats a free-text sector as other and an empty one as unset", () => {
    expect(sectorGroupOf("Interplanetary logistics")).toBe("other");
    expect(sectorGroupOf("")).toBe("unset");
    expect(sectorGroupOf("   ")).toBe("unset");
  });
});
