import { describe, expect, it } from "vitest";

import {
  chainVisual,
  deriveDisplayName,
  extractChain,
  extractWalletFields,
  hashHue,
  normalizeTags,
  profileReach,
  protocolVisual,
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

  it("cascades chain logos: our Cloudinary SVG first, then DefiLlama", () => {
    expect(chainVisual("eth-mainnet")).toEqual({
      label: "Ethereum",
      abbr: "ETH",
      color: "#627EEA",
      logoUrls: [
        "https://res.cloudinary.com/dwnkqkx8q/image/upload/onchain/chains/ethereum.svg",
        "https://icons.llamao.fi/icons/chains/rsz_ethereum",
      ],
    });
    // BNB Chain's Cloudinary slug is overridden to "bnb"; DefiLlama uses "binance".
    expect(chainVisual("bsc-mainnet")?.logoUrls).toEqual([
      "https://res.cloudinary.com/dwnkqkx8q/image/upload/onchain/chains/bnb.svg",
      "https://icons.llamao.fi/icons/chains/rsz_binance",
    ]);
  });

  it("covers the whole Alchemy set — a non-DefiLlama chain still gets a Cloudinary URL", () => {
    // ADI, Celo, etc. aren't on DefiLlama; they get a Cloudinary-only source, so
    // uploading onchain/chains/<slug>.svg is all it takes to add a chain's logo.
    expect(chainVisual("adi-mainnet")).toMatchObject({ label: "ADI" });
    expect(chainVisual("adi-mainnet")?.logoUrls).toEqual([
      "https://res.cloudinary.com/dwnkqkx8q/image/upload/onchain/chains/adi.svg",
    ]);
    expect(chainVisual("celo-mainnet")?.logoUrls).toEqual([
      "https://res.cloudinary.com/dwnkqkx8q/image/upload/onchain/chains/celo.svg",
    ]);
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

describe("protocolVisual", () => {
  it("maps a curated protocol, stripping the version suffix, with a real logo", () => {
    expect(protocolVisual("aave_v3")).toEqual({
      label: "Aave",
      abbr: "AAVE",
      color: "#B6509E",
      logoUrls: ["https://icons.llamao.fi/icons/protocols/aave?w=48&h=48"],
    });
    expect(protocolVisual("uniswap-v3")?.label).toBe("Uniswap");
    expect(protocolVisual("uniswap-v3")?.logoUrls?.[0]).toContain(
      "protocols/uniswap"
    );
    expect(protocolVisual("compound_v2")?.abbr).toBe("COMP");
  });

  it("title-cases an unknown protocol on a deterministic hue", () => {
    const v = protocolVisual("frax_lend");
    expect(v?.label).toBe("Frax Lend");
    expect(v?.color).toMatch(/^hsl\(/);
    // Same family → same hue regardless of version, so chips stay stable.
    expect(protocolVisual("frax_lend_v2")?.color).toBe(v?.color);
  });

  it("returns null for a blank/non-string protocol", () => {
    expect(protocolVisual("")).toBeNull();
    expect(protocolVisual(undefined)).toBeNull();
  });
});
