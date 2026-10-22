import { describe, expect, it } from "vitest";

import { SOURCES } from "../data/sources";
import {
  fallbackSources,
  searchMigrations,
  searchSources,
  setupDocUrl,
  sourceCount,
  sourcesOfKind,
  sourceStatus,
} from "./sources";

describe("searchSources", () => {
  it("returns the whole catalog for an empty query", () => {
    expect(searchSources("")).toHaveLength(SOURCES.length);
    expect(searchSources("   ")).toHaveLength(SOURCES.length);
  });

  it("matches on name, alias, and the 'gives' text, case-insensitively", () => {
    // alias: "cdp" -> Segment
    expect(searchSources("cdp").map((s) => s.id)).toContain("segment");
    // alias: "excel" -> CSV upload
    expect(searchSources("EXCEL").map((s) => s.id)).toContain("csv");
    // name
    expect(searchSources("privy").map((s) => s.id)).toEqual(["privy"]);
  });

  it("returns nothing for a tool we do not have", () => {
    expect(searchSources("definitely-not-a-source")).toEqual([]);
  });
});

describe("sourcesOfKind / sourceCount", () => {
  it("agree and partition the catalog", () => {
    const kinds = ["wallet-auth", "chain", "file", "product", "pipe"] as const;
    const total = kinds.reduce((n, k) => n + sourceCount(k), 0);
    expect(total).toBe(SOURCES.length);
    for (const k of kinds) {
      expect(sourcesOfKind(k)).toHaveLength(sourceCount(k));
      expect(sourcesOfKind(k).every((s) => s.kind === k)).toBe(true);
    }
  });
});

describe("fallbackSources", () => {
  it("resolves the inbound webhook and SDK, in order", () => {
    expect(fallbackSources().map((s) => s.id)).toEqual(["webhook-in", "sdk"]);
  });
});

describe("setupDocUrl", () => {
  it("builds a versioned https doc url per id", () => {
    expect(setupDocUrl("privy")).toBe(
      "https://onchainsuite.xyz/setup/privy.md"
    );
  });
});

describe("searchMigrations", () => {
  it("returns all migrations for an empty query", () => {
    expect(searchMigrations("").length).toBeGreaterThan(0);
  });

  it("matches on name and what it brings", () => {
    expect(searchMigrations("klaviyo").map((m) => m.id)).toEqual(["klaviyo"]);
    expect(searchMigrations("consent").map((m) => m.id)).toContain("klaviyo");
  });
});

describe("sourceStatus", () => {
  const byId = (id: string) => {
    const s = SOURCES.find((x) => x.id === id);
    if (!s) throw new Error(id);
    return s;
  };
  const verified = {
    connector: "privy",
    kind: "source" as const,
    config: {},
    fingerprint: "",
    verified: true,
    verifiedAt: "2026-10-22T00:00:00Z",
    lastError: null,
    updatedAt: "",
  };

  it("reads contracts from the indexed count", () => {
    expect(sourceStatus(byId("contracts"), [], 0)).toBe("available");
    expect(sourceStatus(byId("contracts"), [], 2)).toBe("connected");
  });

  it("is connected only once a connector's credential verifies", () => {
    expect(sourceStatus(byId("privy"), [], 0)).toBe("available");
    expect(sourceStatus(byId("privy"), [verified], 0)).toBe("connected");
    expect(
      sourceStatus(byId("privy"), [{ ...verified, verified: false }], 0)
    ).toBe("available");
  });

  it("matches Google Sheets by its backend id", () => {
    expect(
      sourceStatus(
        byId("sheets"),
        [{ ...verified, connector: "googlesheets" }],
        0
      )
    ).toBe("connected");
  });

  it("reads anything with no backend as soon, but keeps the events API and CSV", () => {
    expect(sourceStatus(byId("segment"), [], 0)).toBe("soon");
    expect(sourceStatus(byId("sdk"), [], 0)).toBe("available");
    expect(sourceStatus(byId("csv"), [], 0)).toBe("connected");
  });
});
