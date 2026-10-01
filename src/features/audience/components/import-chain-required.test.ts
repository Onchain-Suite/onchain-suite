import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isChainRequired as chainRequired } from "../imports/chain-requirement";

/**
 * The rule behind the import step's chain picker.
 *
 * The picker answers "which chain should we enrich these wallets on". For a
 * list of email-only contacts that question has no meaning, and requiring an
 * answer left those users on a permanently disabled Import button — the
 * commonest import we have, blocked by a field about a column their file does
 * not contain.
 *
 * The backend never required it: `defaultChain` is optional, and the import
 * writes `walletChain` only when a row has a wallet address, so email-only rows
 * already store null. The UI was stricter than the thing it talks to.
 */
describe("import chain requirement", () => {
  it("does NOT ask an email-only CSV for a chain", () => {
    // The regression this exists for.
    expect(
      chainRequired({ format: "csv", mappings: ["email", "name", "tags"] })
    ).toBe(false);
  });

  it("asks when the file carries wallets", () => {
    expect(
      chainRequired({ format: "csv", mappings: ["email", "wallet"] })
    ).toBe(true);
  });

  it("does not ask when a per-row Chain column already answers it", () => {
    // Per-row chain wins over the global picker, so demanding both is
    // redundant — and the redundant one is the blocking one.
    expect(
      chainRequired({ format: "csv", mappings: ["wallet", "chain"] })
    ).toBe(false);
  });

  it("still asks for JSON, where there is no mapping to inspect", () => {
    // We cannot tell whether wallets are present, and silently defaulting the
    // chain on a wallet import is the worse error: it enriches on the wrong
    // chain, which is how every wallet ended up with an ETH logo before.
    expect(chainRequired({ format: "json", mappings: [] })).toBe(true);
  });

  it("does not ask before a format is known", () => {
    // Nothing uploaded yet — the button is already disabled on `!uploadedFile`,
    // so this must not add a second reason that outlives it.
    expect(chainRequired({ format: undefined, mappings: [] })).toBe(false);
  });

  it("ignores unmapped columns named like wallets", () => {
    // Only an explicit `wallet` MAPPING counts. A skipped column is not data.
    expect(chainRequired({ format: "csv", mappings: ["email", ""] })).toBe(
      false
    );
  });
});

/**
 * The pure rule above is necessary but not sufficient: the wizard enforced the
 * chain in TWO places — the button's `disabled` prop and a separate throw
 * inside the submit handler — and fixing only the first left the second
 * rejecting every email-only import with IMPORT_CHAIN_REQUIRED at the last
 * step. A user who got past the button hit a wall one click later.
 *
 * So this asserts the source itself: every chain guard must go through the
 * shared rule. A source scan is a blunt instrument, but it is the only thing
 * that catches a second call site being added later, which is exactly how this
 * broke the first time.
 */
describe("import-export.tsx chain guards", () => {
  const source = readFileSync(join(__dirname, "import-export.tsx"), "utf8");

  it("has no unguarded `!selectedChain` throw", () => {
    const unguarded = /if\s*\(\s*!selectedChain\s*\)/.test(source);
    expect(unguarded).toBe(false);
  });

  it("derives every chain guard from the shared rule", () => {
    expect(source).toContain("isChainRequired");
    // Each place that blocks on a missing chain pairs it with `chainRequired`.
    const guards = source.match(/!selectedChain/g) ?? [];
    const paired = source.match(/chainRequired && !selectedChain/g) ?? [];
    expect(guards.length).toBeGreaterThan(0);
    expect(paired.length).toBe(guards.length);
  });
});
