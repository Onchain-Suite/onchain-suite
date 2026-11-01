import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  pdfPathForSlug,
  strategyPathForSlug,
} from "./retention-playbook-params";
import {
  gatedPath,
  isGatedStrategy,
  passcodeHash,
  passcodeMatches,
  STRATEGY_PASSCODE_HASHES,
} from "./strategy-gate";

// The real passcodes never appear here: the repo is public, so the matching is
// tested on a throwaway strategy with a throwaway code.
const SLUG = "test-client";
const CODE = "Test-Code";

describe("strategy gate", () => {
  beforeEach(async () => {
    STRATEGY_PASSCODE_HASHES[SLUG] = await passcodeHash(SLUG, CODE);
  });
  afterEach(() => {
    delete STRATEGY_PASSCODE_HASHES[SLUG];
  });

  it("gates Yauga and not the sector strategies", () => {
    expect(isGatedStrategy("yauga")).toBe(true);
    expect(isGatedStrategy("defi")).toBe(false);
    expect(isGatedStrategy("toString")).toBe(false);
  });

  it("finds the page and the PDF by the same paths as the helpers", () => {
    expect(gatedPath(strategyPathForSlug("yauga"))).toEqual({
      slug: "yauga",
      kind: "page",
    });
    expect(gatedPath(`${strategyPathForSlug("yauga")}/`)).toEqual({
      slug: "yauga",
      kind: "page",
    });
    expect(gatedPath(pdfPathForSlug("yauga"))).toEqual({
      slug: "yauga",
      kind: "pdf",
    });
    expect(gatedPath(strategyPathForSlug("perp-dexes"))).toBeUndefined();
    expect(gatedPath(pdfPathForSlug("defi"))).toBeUndefined();
  });

  it("accepts the passcode in any case, with spaces around it", async () => {
    expect(await passcodeMatches(SLUG, CODE)).toBe(true);
    expect(await passcodeMatches(SLUG, "  test-code ")).toBe(true);
  });

  it("refuses a wrong or missing passcode, and an ungated slug", async () => {
    expect(await passcodeMatches(SLUG, "Test")).toBe(false);
    expect(await passcodeMatches(SLUG, undefined)).toBe(false);
    expect(await passcodeMatches("defi", CODE)).toBe(false);
  });

  it("salts the hash with the slug", async () => {
    expect(await passcodeHash(SLUG, CODE)).not.toBe(
      await passcodeHash("other", CODE)
    );
  });
});
