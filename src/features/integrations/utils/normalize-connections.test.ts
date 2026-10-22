import { describe, expect, it } from "vitest";

import {
  toConnection,
  toConnectionList,
  toEventsCatalog,
  toIdentitySync,
  toIterableStatus,
  toMigrationResult,
} from "./normalize-connections";

describe("toConnection", () => {
  it("keeps the server's shape and drops rows without a connector", () => {
    expect(
      toConnection({
        connector: "telegram",
        kind: "channel",
        config: { label: "@bot" },
        fingerprint: "f",
        verified: false,
        verifiedAt: null,
        lastError: "Unauthorized",
        updatedAt: "2026-10-22T00:00:00Z",
      })
    ).toEqual({
      connector: "telegram",
      kind: "channel",
      config: { label: "@bot" },
      fingerprint: "f",
      verified: false,
      verifiedAt: null,
      lastError: "Unauthorized",
      updatedAt: "2026-10-22T00:00:00Z",
    });
    expect(toConnection({ kind: "source" })).toBeNull();
    expect(toConnection("nope")).toBeNull();
  });

  it("treats a verifiedAt as verified", () => {
    expect(
      toConnection({ connector: "privy", verifiedAt: "2026-10-22T00:00:00Z" })
        ?.verified
    ).toBe(true);
  });
});

describe("toConnectionList", () => {
  it("reads an array or a { connections } wrapper", () => {
    expect(toConnectionList([{ connector: "a" }, null])).toHaveLength(1);
    expect(
      toConnectionList({ connections: [{ connector: "a" }] })
    ).toHaveLength(1);
    expect(toConnectionList(undefined)).toEqual([]);
  });
});

describe("toMigrationResult", () => {
  it("zeroes missing counts and keeps paging", () => {
    const r = toMigrationResult({
      scanned: 10,
      hasMore: true,
      nextPage: 3,
      listName: "Imported from beehiiv",
      warnings: ["a", 1],
    });
    expect(r.created).toBe(0);
    expect(r.held).toEqual({
      unsubscribed: 0,
      unconfirmed: 0,
      invalid: 0,
      unreachable: 0,
    });
    expect(r.nextPage).toBe(3);
    expect(r.nextCursor).toBeNull();
    expect(r.listName).toBe("Imported from beehiiv");
    expect(r.warnings).toEqual(["a"]);
  });
});

describe("toIdentitySync", () => {
  it("only flags Dynamic's cap when the server does", () => {
    expect(toIdentitySync({ scanned: 1 }).truncatedAtCap).toBeUndefined();
    expect(toIdentitySync({ truncatedAtCap: true }).truncatedAtCap).toBe(true);
  });
});

describe("toIterableStatus", () => {
  it("reads unknown states as unknown and carries the result", () => {
    expect(toIterableStatus({ state: "exploded" }).state).toBe("unknown");
    const done = toIterableStatus({
      jobId: "iterable:o",
      state: "completed",
      result: { created: 5, listName: "Imported from Iterable" },
    });
    expect(done.result?.created).toBe(5);
    expect(done.result?.held.invalid).toBe(0);
  });
});

describe("toEventsCatalog", () => {
  it("drops nameless events and defaults the window", () => {
    expect(
      toEventsCatalog({
        events: [{ event: "deposit", count: 4 }, { count: 2 }],
      })
    ).toEqual({ events: [{ event: "deposit", count: 4 }], windowDays: 30 });
  });
});
