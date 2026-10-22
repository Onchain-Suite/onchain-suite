import { describe, expect, it } from "vitest";

import { classify, parseAbi } from "./contract-input";

// The whole point of one input box is that it is never wrong about what you gave it. Every
// misclassification is a person being told to go and find something they already pasted.
describe("classify", () => {
  const ADDR = "0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e";

  it("takes a bare address without deciding whether it is a contract or a wallet", () => {
    const c = classify(ADDR);
    expect(c.form).toBe("address");
    expect(c.value).toBe(ADDR.toLowerCase());
    expect(c.label).toBe("An address");
  });

  it("tolerates the whitespace a copy out of a terminal leaves behind", () => {
    expect(classify(`  ${ADDR}\n`).form).toBe("address");
  });

  it("reads the chain out of an explorer host", () => {
    expect(classify(`https://basescan.org/address/${ADDR}`)).toMatchObject({
      form: "explorer",
      chain: "Base",
    });
    expect(classify(`etherscan.io/token/${ADDR}`)).toMatchObject({
      form: "explorer",
      chain: "Ethereum",
    });
    expect(classify(`https://arbiscan.io/address/${ADDR}#code`).chain).toBe(
      "Arbitrum"
    );
  });

  it("still recognises an explorer on a subdomain", () => {
    expect(
      classify(`https://sepolia.basescan.org/address/${ADDR}`)
    ).toMatchObject({ form: "explorer", chain: "Base" });
  });

  it("pulls the contract out of a transaction link rather than sending the person back", () => {
    const tx = `0x${"a".repeat(64)}`;
    const c = classify(`https://basescan.org/tx/${tx}`);
    expect(c.form).toBe("explorer");
    expect(c.value).toBe(tx);
    expect(c.next).toMatch(/transaction/i);
  });

  it("says so when an explorer link carries no address", () => {
    expect(classify("https://basescan.org/blocks")).toMatchObject({
      form: "explorer",
      value: "",
    });
  });

  it("separates ENS, websites and symbols", () => {
    expect(classify("maya.eth").form).toBe("ens");
    expect(classify("acme.xyz").form).toBe("website");
    expect(classify("https://www.acme.xyz/mint").value).toBe("acme.xyz");
    expect(classify("ACME").form).toBe("symbol");
    expect(classify("$degen").value).toBe("DEGEN");
  });

  it("admits when it cannot tell, instead of guessing", () => {
    expect(classify("0x123").form).toBe("unknown");
    expect(classify("the staking one").form).toBe("unknown");
    expect(classify("").form).toBe("empty");
  });
});

describe("parseAbi", () => {
  const abi = [
    { type: "event", name: "Staked", inputs: [] },
    { type: "event", name: "Unstaked", inputs: [] },
    { type: "function", name: "stake", inputs: [] },
  ];

  it("takes a bare array or a whole build artifact", () => {
    expect(parseAbi(JSON.stringify(abi))).toEqual({
      events: ["Staked", "Unstaked"],
      functions: 1,
    });
    expect(
      parseAbi(JSON.stringify({ contractName: "X", abi }))?.events
    ).toHaveLength(2);
  });

  it("rejects anything that is not an ABI", () => {
    expect(parseAbi('{"name":"not an abi"}')).toBeNull();
    expect(parseAbi("[1,2,3]")).toBeNull();
    expect(parseAbi("[]")).toBeNull();
    expect(parseAbi("not json at all")).toBeNull();
  });
});
