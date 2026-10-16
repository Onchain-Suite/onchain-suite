import { describe, expect, it } from "vitest";

import { parseJsonish } from "./interface-paste";

/** The paste that motivated this: viem-style ABI copied out of a .ts file. */
const VIEM_STYLE = `[
  {
    type: "function",
    name: "getReactiveAlert",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "level", type: "uint8" },
      { name: "until", type: "uint64" },
    ],
  },
  {
    type: "event",
    name: "AlertLevelRaised",
    inputs: [
      { indexed: false, name: "level", type: "uint8" },
      { indexed: false, name: "until", type: "uint64" },
    ],
    anonymous: false,
  },
]`;

describe("parseJsonish", () => {
  it("reads a viem-style ABI with unquoted keys and trailing commas", () => {
    const result = parseJsonish(VIEM_STYLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedFallback).toBe(true);

    const abi = result.value as { type: string; name: string }[];
    expect(abi).toHaveLength(2);
    expect(abi[1]).toMatchObject({ type: "event", name: "AlertLevelRaised" });
  });

  it("keeps booleans as booleans rather than quoting them", () => {
    const result = parseJsonish(VIEM_STYLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const abi = result.value as {
      anonymous?: boolean;
      inputs: { indexed?: boolean }[];
    }[];
    // Quoting a bare identifier that ISN'T a key would turn `false` into
    // "false", which is truthy — an indexed/non-indexed mix-up that would
    // silently produce the wrong topic layout.
    expect(abi[1].anonymous).toBe(false);
    expect(abi[1].inputs[0].indexed).toBe(false);
  });

  it("does not take the fallback path for real JSON", () => {
    const result = parseJsonish('[{"type":"event","name":"Transfer"}]');
    expect(result).toMatchObject({ ok: true, usedFallback: false });
  });

  it("accepts a whole `export const … as const` declaration", () => {
    const result = parseJsonish(
      `export const hookAbi = [{ type: 'event', name: 'Swap' }] as const;`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([{ type: "event", name: "Swap" }]);
  });

  it("strips line and block comments", () => {
    const result = parseJsonish(`[
      // the one automations watch
      { type: "event", name: "Swap" }, /* legacy */
    ]`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([{ type: "event", name: "Swap" }]);
  });

  it("leaves punctuation inside strings alone", () => {
    // A regex-based rewrite mangles exactly this: the braces, colon, comma and
    // `//` here are DATA, and the scanner has to know it is inside a string.
    const result = parseJsonish(
      `[{ type: "event", name: "Odd{a:1,b//2}Name" }]`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      { type: "event", name: "Odd{a:1,b//2}Name" },
    ]);
  });

  it("converts single-quoted strings, escapes included", () => {
    const result = parseJsonish(`[{ name: 'it\\'s "quoted"' }]`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([{ name: `it's "quoted"` }]);
  });

  it("reports the STRICT error for text neither parser can read", () => {
    const result = parseJsonish("[{ type: }]");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Positions must refer to what the user pasted, not to rewritten text they
    // have never seen.
    expect(result.message).toMatch(/position|JSON/i);
  });

  it("treats an empty paste as nothing rather than an error to fix", () => {
    expect(parseJsonish("   ")).toMatchObject({ ok: false });
  });
});

/**
 * Solana. An Anchor IDL reaches people as `anchor idl fetch` output (real JSON)
 * or as the generated `src/idl/my_program.ts`, which is a TS literal with a
 * TYPE ANNOTATION on the declaration — `export const IDL: MyProgram = {...}`.
 * That annotation is the part an EVM-shaped stripper would miss.
 */
describe("parseJsonish — Anchor IDLs", () => {
  it("reads a generated IDL module, type annotation and all", () => {
    const result = parseJsonish(`export const IDL: GoldgardVault = {
      version: "0.1.0",
      name: "goldgard_vault",
      instructions: [
        { name: "deposit", accounts: [], args: [] },
        { name: "withdraw", accounts: [], args: [] },
      ],
      events: [
        {
          name: "DepositMade",
          fields: [{ name: "amount", type: "u64", index: false }],
        },
      ],
    };`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedFallback).toBe(true);

    const idl = result.value as {
      name: string;
      events: { name: string; fields: { index: boolean }[] }[];
      instructions: { name: string }[];
    };
    expect(idl.name).toBe("goldgard_vault");
    expect(idl.instructions.map((i) => i.name)).toEqual([
      "deposit",
      "withdraw",
    ]);
    expect(idl.events[0].name).toBe("DepositMade");
    // Same booleans-must-stay-booleans hazard as an EVM `indexed` flag.
    expect(idl.events[0].fields[0].index).toBe(false);
  });

  it("keeps an IDL that declares instructions but no events", () => {
    // Solana triggers can match an INSTRUCTION name, so this is usable and
    // must not be normalised away or rejected downstream.
    const result = parseJsonish(
      `{ version: '0.1.0', name: 'p', instructions: [{ name: 'swap' }] }`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      version: "0.1.0",
      name: "p",
      instructions: [{ name: "swap" }],
    });
  });

  it("preserves case in a base58 program id", () => {
    // Base58 is case-SENSITIVE and its alphabet omits 0, O, I and l. Any
    // lowercasing here would produce an address that does not exist.
    const id = "GoLDg1rdVau1tPr0gram11111111111111111111111";
    const result = parseJsonish(`{ metadata: { address: '${id}' } }`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ metadata: { address: id } });
  });
});
