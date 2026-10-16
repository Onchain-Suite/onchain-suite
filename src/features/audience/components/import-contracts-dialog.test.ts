import { describe, expect, it } from "vitest";

import { parseContractLines } from "./import-contracts-dialog";

const EVM = "0x1234567890abcdef1234567890abcdef12345678";
const EVM2 = "0xabcdef1234567890abcdef1234567890abcdef12";

describe("parseContractLines", () => {
  it("applies the default chain and accepts one address per line", () => {
    const { rows, skipped } = parseContractLines(
      `${EVM}\n${EVM2}`,
      "eth-mainnet"
    );
    expect(skipped).toBe(0);
    expect(rows).toEqual([
      { address: EVM, chain: "eth-mainnet" },
      { address: EVM2, chain: "eth-mainnet" },
    ]);
  });

  it("honors a per-line 'address,chain' over the default", () => {
    const { rows } = parseContractLines(
      `${EVM},base-mainnet\n${EVM2}`,
      "eth-mainnet"
    );
    expect(rows).toEqual([
      { address: EVM, chain: "base-mainnet" },
      { address: EVM2, chain: "eth-mainnet" },
    ]);
  });

  it("counts malformed lines instead of dropping them silently", () => {
    const { rows, skipped } = parseContractLines(
      `${EVM}\nnot-an-address\n0x123`,
      "eth-mainnet"
    );
    expect(rows).toHaveLength(1);
    expect(skipped).toBe(2);
  });

  it("dedupes within the paste by chain+address", () => {
    const { rows } = parseContractLines(
      `${EVM}\n${EVM.toUpperCase().replace("0X", "0x")}`,
      "eth-mainnet"
    );
    expect(rows).toHaveLength(1);
  });

  it("ignores blank lines", () => {
    const { rows } = parseContractLines(`\n${EVM}\n\n`, "eth-mainnet");
    expect(rows).toHaveLength(1);
  });
});
