import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  contractsKey,
  readStartedKey,
  settleWithin,
  shouldStartIndexing,
  writeStartedKey,
} from "./indexing-start";

const onBase = { address: "0xABC", chain: "base-mainnet" };

describe("contractsKey", () => {
  it("is the same for the same contracts in any order or case", () => {
    const a = contractsKey([
      onBase,
      { address: "0xdef", chain: "eth-mainnet" },
    ]);
    const b = contractsKey([
      { address: "0xDEF", chain: "ETH-mainnet" },
      { address: "0xabc", chain: "base-mainnet", name: "Vault" },
    ]);
    expect(a).toBe(b);
  });

  it("differs when the same address is on another chain", () => {
    expect(contractsKey([onBase])).not.toBe(
      contractsKey([{ ...onBase, chain: "arb-mainnet" }])
    );
  });
});

describe("contractsKey and the workspace", () => {
  // The same contract set up in a second workspace was silently skipped.
  it("differs between workspaces for the same contract", () => {
    expect(contractsKey([onBase], "org_a")).not.toBe(
      contractsKey([onBase], "org_b")
    );
    expect(
      shouldStartIndexing([onBase], contractsKey([onBase], "org_a"), "org_b")
    ).toBe(true);
    expect(
      shouldStartIndexing([onBase], contractsKey([onBase], "org_a"), "org_a")
    ).toBe(false);
  });
});

describe("shouldStartIndexing", () => {
  it("starts for a contract that has not been started", () => {
    expect(shouldStartIndexing([onBase], null)).toBe(true);
  });

  it("does not start twice for the same contract", () => {
    expect(shouldStartIndexing([onBase], contractsKey([onBase]))).toBe(false);
  });

  it("starts again when the contract changes", () => {
    expect(
      shouldStartIndexing(
        [{ address: "0xdef", chain: "base-mainnet" }],
        contractsKey([onBase])
      )
    ).toBe(true);
  });

  it("has nothing to start without a contract", () => {
    expect(shouldStartIndexing([], null)).toBe(false);
  });
});

describe("the started key", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("survives a reload within the session, and can be forgotten", () => {
    expect(readStartedKey()).toBeNull();
    writeStartedKey("base-mainnet:0xabc");
    expect(readStartedKey()).toBe("base-mainnet:0xabc");
    writeStartedKey(null);
    expect(readStartedKey()).toBeNull();
  });
});

describe("settleWithin", () => {
  it("resolves as soon as the work settles, either way", async () => {
    await expect(settleWithin(Promise.resolve("ok"), 5000)).resolves.toBe(
      undefined
    );
    await expect(
      settleWithin(Promise.reject(new Error("no")), 5000)
    ).resolves.toBe(undefined);
  });

  it("stops waiting for work that takes too long", async () => {
    vi.useFakeTimers();
    let settled = false;
    const waiting = settleWithin(new Promise(() => undefined), 2500).then(
      () => {
        settled = true;
      }
    );
    await vi.advanceTimersByTimeAsync(2400);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    await waiting;
    expect(settled).toBe(true);
    vi.useRealTimers();
  });
});
