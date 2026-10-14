import { describe, expect, it } from "vitest";

import { SOURCES } from "../data/sources";
import {
  fallbackSources,
  searchMigrations,
  searchSources,
  setupDocUrl,
  sourceCount,
  sourcesOfKind,
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
