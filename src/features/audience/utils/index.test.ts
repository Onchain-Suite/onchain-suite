import { describe, expect, it } from "vitest";

import {
  chainVisual,
  deriveDisplayName,
  extractChain,
  extractWalletFields,
  hashHue,
  normalizeTags,
  profileReach,
  resolveChainLabel,
  shortenWallet,
} from ".";

describe("audience utils", () => {
  it("normalizes tags from strings and objects", () => {
    expect(normalizeTags(["vip", { name: "newsletter" }, { id: "x" }])).toEqual(
      ["vip", "newsletter", "x"]
    );
    expect(normalizeTags([{ name: "  " }, null, 1])).toEqual([]);
  });

  it("shortens wallet addresses", () => {
    expect(shortenWallet("")).toBe("");
    expect(shortenWallet("0x1234")).toBe("0x1234");
    expect(shortenWallet("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234…5678"
    );
  });

  it("extracts wallet fields from different shapes", () => {
    expect(
      extractWalletFields({
        walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      })
    ).toEqual({
      walletFull: "0x1234567890abcdef1234567890abcdef12345678",
      wallet: "0x1234…5678",
    });
    expect(extractWalletFields({ wallet: { address: "0xabc" } })).toEqual({
      walletFull: "0xabc",
      wallet: "0xabc",
    });
    expect(extractWalletFields({ wallets: [{ address: "0xdef" }] })).toEqual({
      walletFull: "0xdef",
      wallet: "0xdef",
    });
  });

  it("derives a display name from name/email/wallet", () => {
    expect(
      deriveDisplayName({ name: "Alice Smith", email: "alice@example.com" })
    ).toBe("Alice Smith");
    expect(deriveDisplayName({ email: "lucas.martin@example.com" })).toBe(
      "Lucas Martin"
    );
    expect(
      deriveDisplayName({
        email: "x@example.com",
        walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      })
    ).toBe("X");
  });

  it("hashes a string to a stable hue", () => {
    const a = hashHue("abc");
    const b = hashHue("abc");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(360);
  });
});

describe("profileReach", () => {
  it("counts an imported contact with a plain email as email-reachable (no channels object)", () => {
    // The exact case /audience/overview under-counts: present email, unverified,
    // no channels payload. Must be email-reachable, not push.
    expect(profileReach({ email: "a@b.com", status: "pending" })).toEqual({
      email: true,
      push: false,
    });
  });

  it("prefers the server channels object when present", () => {
    expect(
      profileReach({
        email: "a@b.com",
        channels: { email: false, inapp: true },
      })
    ).toEqual({ email: false, push: true });
  });

  it("treats a synthetic wallet-placeholder email as no email channel", () => {
    expect(profileReach({ email: "0xabc@wallet.onchainsuite.local" })).toEqual({
      email: false,
      push: false,
    });
  });

  it("is push-reachable from a wallet, and a verified wallet is email-reachable", () => {
    expect(
      profileReach({
        walletAddress: "0x1111111111111111111111111111111111111111",
        status: "verified",
      })
    ).toEqual({ email: true, push: true });
    expect(
      profileReach({
        walletAddress: "0x2222222222222222222222222222222222222222",
        status: "pending",
      })
    ).toEqual({ email: false, push: true });
  });
});

describe("chain labels", () => {
  const EVM = "0x1234567890abcdef1234567890abcdef12345678";
  const SOL = "7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs";

  it("normalizes slugs, names and tickers to a display label", () => {
    expect(resolveChainLabel("eth-mainnet")).toBe("Ethereum");
    expect(resolveChainLabel("Ethereum")).toBe("Ethereum");
    expect(resolveChainLabel("base")).toBe("Base");
    expect(resolveChainLabel("SOL")).toBe("Solana");
    expect(resolveChainLabel("arbitrum")).toBe("Arbitrum");
    // Unknown-but-present is title-cased, not dropped.
    expect(resolveChainLabel("zksync-era")).toBe("Zksync Era");
    expect(resolveChainLabel("")).toBeNull();
    expect(resolveChainLabel(undefined)).toBeNull();
  });

  it("prefers an explicit chain from wallets[] or attributes", () => {
    expect(extractChain({ wallets: [{ chain: "base-mainnet" }] }, EVM)).toBe(
      "Base"
    );
    expect(extractChain({ attributes: { chain: "polygon" } }, EVM)).toBe(
      "Polygon"
    );
  });

  it("falls back to the address family when no explicit chain", () => {
    expect(extractChain({}, EVM)).toBe("EVM");
    expect(extractChain({}, SOL)).toBe("Solana");
  });

  it("returns null for a contact with no wallet (never badge email-only rows)", () => {
    expect(extractChain({ attributes: { chain: "base" } }, "")).toBeNull();
  });

  it("gives curated chains a brand color + ticker, keyed by slug or suffix", () => {
    expect(chainVisual("eth-mainnet")).toEqual({
      label: "Ethereum",
      abbr: "ETH",
      color: "#627EEA",
    });
    expect(chainVisual("base-mainnet")?.color).toBe("#0052FF");
    expect(chainVisual("SOL")).toEqual({
      label: "Solana",
      abbr: "SOL",
      color: "#14F195",
    });
  });

  it("falls back to label initials on a deterministic hue for unknown chains", () => {
    const v = chainVisual("zksync-era");
    expect(v?.label).toBe("Zksync Era");
    expect(v?.abbr).toBe("ZKS");
    // Deterministic: same input → same hue, so React keys stay stable.
    expect(v?.color).toBe(chainVisual("zksync-era")?.color);
    expect(v?.color).toMatch(/^hsl\(/);
  });

  it("returns null for a blank/non-string chain", () => {
    expect(chainVisual("")).toBeNull();
    expect(chainVisual(undefined)).toBeNull();
  });
});
