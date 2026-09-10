import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import type { ReactElement } from "react";

// Date formatting is app-wide, not audience-specific - it lives in
// @/lib/date. Imported for local use below and re-exported so existing
// audience imports keep working.
import { formatDateTime } from "@/lib/date";

export type NormalizedTag = string;
export type SocialHandles = {
  ens?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
};

export type ChainMeta = {
  key: string;
  name: string;
  icon: ReactElement;
};

export function getStatusIcon(status: string): ReactElement {
  switch (status) {
    case "verified":
      return (
        <CheckCircleIcon
          className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      );
    case "pending":
      return (
        <ClockIcon
          className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
      );
    default:
      return (
        <ExclamationCircleIcon
          className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400"
          aria-hidden="true"
        />
      );
  }
}

/**
 * Health tiers map to the semantic status family used across the app
 * (emerald = healthy, amber = cooling, rose = at risk), with dark: variants
 * so both themes read clearly.
 */
export function getHealthColor(score: number): string {
  if (score >= 70) return "text-emerald-700 dark:text-emerald-300";
  if (score >= 40) return "text-amber-700 dark:text-amber-300";
  return "text-rose-700 dark:text-rose-300";
}

export function getHealthBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-500 dark:bg-emerald-400";
  if (score >= 40) return "bg-amber-500 dark:bg-amber-400";
  return "bg-rose-500 dark:bg-rose-400";
}

/**
 * Contact health indicator: a fixed-height, rounded track (`bg-muted`) with
 * a tier-colored fill. Exposes the score to assistive tech via `role="meter"`
 * and an aria-label.
 */
export function HealthBar({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}): ReactElement {
  const clamped =
    typeof score === "number" && Number.isFinite(score)
      ? Math.max(0, Math.min(100, Math.round(score)))
      : null;
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped ?? undefined}
      aria-label={
        clamped !== null
          ? `Health score ${clamped} out of 100`
          : "Health score not available"
      }
      className={`h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted ${className ?? ""}`}
    >
      <div
        className={`h-full rounded-full ${getHealthBarColor(clamped ?? 0)}`}
        style={{ width: `${clamped ?? 0}%` }}
      />
    </div>
  );
}

export function normalizeTags(input: unknown): NormalizedTag[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((t) => {
      if (typeof t === "string") return t;
      if (t && typeof t === "object") {
        const obj = t as Record<string, unknown>;
        const candidate = obj.name ?? obj.label ?? obj.value ?? obj.id ?? "";
        return typeof candidate === "string" ? candidate : String(candidate);
      }
      return "";
    })
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Wallet-only contacts are stored with a synthetic placeholder email on the
 * internal `.onchainsuite.local` domain (`…@wallet.onchainsuite.local` for
 * wallet-only rows, `zk_…@contact.onchainsuite.local` for ZK-linked ones).
 * `.local` is a reserved TLD that can never be a real public address, so we
 * treat ANY `*.onchainsuite.local` email as synthetic - "no visible email
 * channel" - rather than leaking the raw hash into the UI.
 */
export function isSyntheticWalletEmail(email: unknown): boolean {
  return (
    typeof email === "string" &&
    email.trim().toLowerCase().endsWith(".onchainsuite.local")
  );
}

export function shortenWallet(input: unknown): string {
  if (typeof input !== "string") return "";
  const s = input.trim();
  if (s.length === 0) return "";
  if (!s.startsWith("0x") || s.length < 10) return s;
  if (s.length <= 18) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export function extractWalletFields(input: unknown): {
  walletFull: string;
  wallet: string;
} {
  if (!input || typeof input !== "object") {
    return { walletFull: "", wallet: "" };
  }
  const obj = input as Record<string, unknown>;
  const candidates: unknown[] = [
    obj.wallet,
    obj.walletAddress,
    obj.wallet_address,
    obj.address,
  ];
  const nestedCandidates = [obj.wallet, obj.walletAddress].flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const nested = v as Record<string, unknown>;
    return [nested.address, nested.walletAddress, nested.wallet];
  });
  const arrayCandidates = [
    obj.wallets,
    obj.addresses,
    obj.walletAddresses,
  ].flatMap((v) => {
    if (!Array.isArray(v)) return [];
    return v.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (!item || typeof item !== "object") return [];
      const nested = item as Record<string, unknown>;
      return [
        nested.address,
        nested.walletAddress,
        nested.wallet_address,
        nested.wallet,
      ];
    });
  });

  const all = [...candidates, ...nestedCandidates, ...arrayCandidates];

  const walletFull = (
    all.find(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    ) ?? ""
  ).trim();
  return { walletFull, wallet: shortenWallet(walletFull) };
}

const toTitleCase = (value: string) => {
  return value
    .split(/[\s._-]+/g)
    .filter((p) => p.length > 0)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
};

// Common chain inputs (slugs, names, tickers) → a short display label. Covers
// the granular slugs the enrichment tables use (eth-mainnet, base-mainnet, …),
// the names/tickers a customer types in a CSV "Chain" column, and the network
// suffixes get stripped so eth-sepolia still reads as Ethereum.
const CHAIN_LABELS: Record<string, string> = {
  eth: "Ethereum",
  ethereum: "Ethereum",
  mainnet: "Ethereum",
  base: "Base",
  arb: "Arbitrum",
  arbitrum: "Arbitrum",
  "arbitrum-one": "Arbitrum",
  op: "Optimism",
  optimism: "Optimism",
  opt: "Optimism",
  polygon: "Polygon",
  matic: "Polygon",
  poly: "Polygon",
  bnb: "BNB Chain",
  bsc: "BNB Chain",
  avax: "Avalanche",
  avalanche: "Avalanche",
  sol: "Solana",
  solana: "Solana",
};

/**
 * Normalize a chain value to a display label. Returns null for a blank/non-string
 * input; an unknown-but-present value is title-cased so a custom chain still
 * shows rather than vanishing.
 */
export function resolveChainLabel(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const key = input.trim().toLowerCase();
  if (!key) return null;
  const bare = key.replace(/-(mainnet|testnet|sepolia|goerli|devnet)$/, "");
  return CHAIN_LABELS[key] ?? CHAIN_LABELS[bare] ?? toTitleCase(key);
}

/** Coarse chain family inferred from an address shape, when no explicit chain
 * is known. EVM = 0x + 40 hex; Solana = base58. Null for anything else. */
function walletFamilyLabel(wallet: string): string | null {
  if (!wallet) return null;
  if (/^0x[0-9a-fA-F]{40}$/.test(wallet)) return "EVM";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) return "Solana";
  return null;
}

/**
 * The chain to badge on a contact row. Prefers an explicit chain from the
 * profile's `wallets[].chain` or `attributes.chain` (what a CSV import writes),
 * and falls back to the family inferred from the wallet address. Returns null
 * when there is no wallet or nothing can be determined — callers only render a
 * chain for wallet-bearing contacts.
 */
export function extractChain(
  profile: unknown,
  walletFull: string
): string | null {
  if (!walletFull) return null;
  if (profile && typeof profile === "object") {
    const { wallets, attributes: attrs } = profile as Record<string, unknown>;
    const fromWallet =
      Array.isArray(wallets) && wallets[0] && typeof wallets[0] === "object"
        ? (wallets[0] as Record<string, unknown>).chain
        : undefined;
    const fromAttr =
      attrs && typeof attrs === "object"
        ? (attrs as Record<string, unknown>).chain
        : undefined;
    const explicit =
      resolveChainLabel(fromWallet) ?? resolveChainLabel(fromAttr);
    if (explicit) return explicit;
  }
  return walletFamilyLabel(walletFull);
}

export function deriveDisplayName(input: {
  name?: unknown;
  fullName?: unknown;
  email?: unknown;
  wallet?: unknown;
  walletAddress?: unknown;
}): string {
  const name =
    typeof input.name === "string" && input.name.trim().length > 0
      ? input.name.trim()
      : typeof input.fullName === "string" && input.fullName.trim().length > 0
        ? input.fullName.trim()
        : "";
  if (name.length > 0) return name;

  if (typeof input.email === "string" && input.email.includes("@")) {
    const local = input.email.split("@")[0] ?? "";
    const cleaned = local.replace(/\+/g, " ").trim();
    const next = cleaned.length > 0 ? toTitleCase(cleaned) : "";
    if (next.length > 0) return next;
  }

  const wallet =
    typeof input.wallet === "string"
      ? input.wallet
      : typeof input.walletAddress === "string"
        ? input.walletAddress
        : "";
  const short = shortenWallet(wallet);
  if (short.length > 0) return short;

  return "Unnamed profile";
}

const KEY_ACRONYMS = new Set([
  "id",
  "url",
  "ens",
  "nft",
  "usd",
  "eth",
  "fid",
  "ltv",
  "api",
  "tx",
]);

/**
 * Humanize a raw attribute key (`wallet_age_days`, `firstSeenAt`) into a
 * readable label ("Wallet Age Days", "First Seen At"). Known crypto acronyms
 * are upper-cased.
 */
export function prettifyKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return spaced
    .split(/[\s._-]+/g)
    .filter((part) => part.length > 0)
    .map((part) => {
      const lower = part.toLowerCase();
      if (KEY_ACRONYMS.has(lower)) return lower.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

export { formatDate, formatDateTime, formatRelativeTime } from "@/lib/date";

const ISO_DATE_LIKE = /^\d{4}-\d{2}-\d{2}(T|\s|$)/;
const HEX_ADDRESS_LIKE = /^0x[a-fA-F0-9]{40,}$/;

export function isAddressLike(value: unknown): value is string {
  return typeof value === "string" && HEX_ADDRESS_LIKE.test(value.trim());
}

/**
 * Format an arbitrary attribute value by type: booleans → Yes/No, numbers →
 * locale strings, ISO dates → locale date-times, addresses → shortened,
 * arrays/objects → readable fallbacks. Unknown values are stringified rather
 * than hidden.
 */
export function formatAttributeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "";
    if (isAddressLike(trimmed)) return shortenWallet(trimmed);
    if (ISO_DATE_LIKE.test(trimmed)) {
      const formatted = formatDateTime(trimmed);
      if (formatted.length > 0) return formatted;
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => formatAttributeValue(item))
      .filter((item) => item.length > 0)
      .join(", ");
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * A visual identity for one on-chain icon chip (a chain, a DeFi protocol, a
 * token): a short abbreviation and a brand color, plus an optional logo URL for
 * chips we have a real image for. Curated for what we recognize; anything else
 * falls back to its label's initials on a deterministic hue, so a new/unknown
 * value still renders a distinct chip rather than vanishing.
 */
export interface IconVisual {
  /** Full display label, e.g. "Ethereum" / "Aave". */
  label: string;
  /** 2-4 char chip text, e.g. "ETH" / "AAVE". */
  abbr: string;
  /** Chip background color (brand color, or a derived hue for unknowns). */
  color: string;
  /** Logo image, when we have one; the chip falls back to `abbr` if it fails. */
  logoUrl?: string;
}

/** @deprecated Use {@link IconVisual}. Kept as an alias for existing callers. */
export type ChainVisual = IconVisual;

// Brand colors + tickers for the chains enrichment covers. Keyed the same way
// resolveChainLabel matches (bare slug with the network suffix stripped).
const CHAIN_VISUALS: Record<string, { abbr: string; color: string }> = {
  eth: { abbr: "ETH", color: "#627EEA" },
  ethereum: { abbr: "ETH", color: "#627EEA" },
  mainnet: { abbr: "ETH", color: "#627EEA" },
  base: { abbr: "BASE", color: "#0052FF" },
  arb: { abbr: "ARB", color: "#28A0F0" },
  arbitrum: { abbr: "ARB", color: "#28A0F0" },
  "arbitrum-one": { abbr: "ARB", color: "#28A0F0" },
  op: { abbr: "OP", color: "#FF0420" },
  opt: { abbr: "OP", color: "#FF0420" },
  optimism: { abbr: "OP", color: "#FF0420" },
  polygon: { abbr: "POL", color: "#8247E5" },
  matic: { abbr: "POL", color: "#8247E5" },
  poly: { abbr: "POL", color: "#8247E5" },
  bnb: { abbr: "BNB", color: "#F3BA2F" },
  bsc: { abbr: "BNB", color: "#F3BA2F" },
  avax: { abbr: "AVAX", color: "#E84142" },
  avalanche: { abbr: "AVAX", color: "#E84142" },
  sol: { abbr: "SOL", color: "#14F195" },
  solana: { abbr: "SOL", color: "#14F195" },
};

/** Initials for an unknown value: first N chars of the label, upper-cased. */
function iconInitials(label: string, take = 3): string {
  const clean = label.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, take) || "?").toUpperCase();
}

// Real brand logos come from DefiLlama's public icon CDN, keyed by the resolved
// display label. It is a convenience layered on top of the colored-ticker chip,
// not a dependency: IconChip renders the logo and falls back to the ticker chip
// on any load error (missing slug, 404, CDN outage), so a wrong/absent entry
// just shows what the column showed before. A chain/protocol with no entry here
// (e.g. a custom chain, EigenLayer — no clean slug) keeps its ticker chip.
const CHAIN_LOGO_SLUG: Record<string, string> = {
  Ethereum: "ethereum",
  Base: "base",
  Arbitrum: "arbitrum",
  Optimism: "optimism",
  Polygon: "polygon",
  "BNB Chain": "binance",
  Avalanche: "avalanche",
  Solana: "solana",
};

function chainLogoUrl(label: string): string | undefined {
  const slug = CHAIN_LOGO_SLUG[label];
  return slug ? `https://icons.llamao.fi/icons/chains/rsz_${slug}` : undefined;
}

/**
 * Resolve a raw chain value (slug/name/ticker) to its {@link IconVisual}.
 * Returns null only for a blank/non-string input; every present chain gets a
 * chip — curated brand color when known, a deterministic hue otherwise, with a
 * real logo layered on when we have one.
 */
export function chainVisual(input: unknown): IconVisual | null {
  const label = resolveChainLabel(input);
  if (!label || typeof input !== "string") return null;
  const key = input.trim().toLowerCase();
  const bare = key.replace(/-(mainnet|testnet|sepolia|goerli|devnet)$/, "");
  const curated = CHAIN_VISUALS[key] ?? CHAIN_VISUALS[bare];
  const logoUrl = chainLogoUrl(label);
  if (curated) return { label, ...curated, logoUrl };
  return {
    label,
    abbr: iconInitials(label),
    color: `hsl(${hashHue(label)} 62% 45%)`,
    logoUrl,
  };
}

// Curated brand color + label for the DeFi protocols enrichment records. Keyed
// by the protocol *family* — the slug with any trailing version stripped, so
// `aave_v3` and `aave_v2` share one Aave chip.
const PROTOCOL_VISUALS: Record<
  string,
  { label: string; abbr: string; color: string }
> = {
  aave: { label: "Aave", abbr: "AAVE", color: "#B6509E" },
  uniswap: { label: "Uniswap", abbr: "UNI", color: "#FF007A" },
  compound: { label: "Compound", abbr: "COMP", color: "#00D395" },
  curve: { label: "Curve", abbr: "CRV", color: "#0E6EFD" },
  lido: { label: "Lido", abbr: "LIDO", color: "#00A3FF" },
  maker: { label: "Maker", abbr: "MKR", color: "#1AAB9B" },
  makerdao: { label: "Maker", abbr: "MKR", color: "#1AAB9B" },
  sky: { label: "Sky", abbr: "SKY", color: "#1AAB9B" },
  morpho: { label: "Morpho", abbr: "MRP", color: "#2C63FF" },
  pendle: { label: "Pendle", abbr: "PDL", color: "#33B7A0" },
  gmx: { label: "GMX", abbr: "GMX", color: "#2D42FC" },
  sushi: { label: "SushiSwap", abbr: "SUSHI", color: "#FA52A0" },
  sushiswap: { label: "SushiSwap", abbr: "SUSHI", color: "#FA52A0" },
  balancer: { label: "Balancer", abbr: "BAL", color: "#414977" },
  convex: { label: "Convex", abbr: "CVX", color: "#3A3A3A" },
  spark: { label: "Spark", abbr: "SPK", color: "#F7B32B" },
  eigenlayer: { label: "EigenLayer", abbr: "EIGN", color: "#1A0C6D" },
  rocketpool: { label: "Rocket Pool", abbr: "RPL", color: "#FF6B4A" },
  "rocket-pool": { label: "Rocket Pool", abbr: "RPL", color: "#FF6B4A" },
};

// DefiLlama protocol-icon slugs, keyed by the curated label. EigenLayer has no
// clean slug on the CDN, so it keeps its ticker chip. Same graceful-fallback
// contract as CHAIN_LOGO_SLUG.
const PROTOCOL_LOGO_SLUG: Record<string, string> = {
  Aave: "aave",
  Uniswap: "uniswap",
  Compound: "compound",
  Curve: "curve",
  Lido: "lido",
  Maker: "makerdao",
  Sky: "sky",
  Morpho: "morpho",
  Pendle: "pendle",
  GMX: "gmx",
  SushiSwap: "sushi",
  Balancer: "balancer",
  Convex: "convex-finance",
  Spark: "spark",
  "Rocket Pool": "rocket-pool",
};

function protocolLogoUrl(label: string): string | undefined {
  const slug = PROTOCOL_LOGO_SLUG[label];
  return slug
    ? `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48`
    : undefined;
}

/**
 * Resolve a DeFi protocol slug (`aave_v3`, `uniswap-v3`, `compound_v2`) to its
 * {@link IconVisual} for the Apps column. Strips the trailing version so a
 * protocol's markets share one chip; unknown protocols fall back to a
 * title-cased label + initials on a deterministic hue. A real logo is layered
 * on when we have one. Null for blank input.
 */
export function protocolVisual(input: unknown): IconVisual | null {
  if (typeof input !== "string") return null;
  const key = input.trim().toLowerCase();
  if (!key) return null;
  // Strip a trailing version token: aave_v3 → aave, uniswap-v3 → uniswap.
  const family = key.replace(/[_-]v?\d+(\.\d+)?$/, "");
  const curated = PROTOCOL_VISUALS[key] ?? PROTOCOL_VISUALS[family];
  if (curated) return { ...curated, logoUrl: protocolLogoUrl(curated.label) };
  const label = toTitleCase(family.replace(/[_-]+/g, " "));
  return {
    label: label || key,
    abbr: iconInitials(label || key, 4),
    color: `hsl(${hashHue(family)} 55% 42%)`,
  };
}

export function hashHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  const next = Math.abs(hash) % 360;
  return Number.isFinite(next) ? next : 210;
}

/**
 * Format a USD amount for compact table/summary cells. Whole dollars (no cents)
 * to match the on-chain value cards elsewhere in the audience UI.
 */
export function formatUsd(value: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value)}`;
  }
}

/**
 * Read a profile/member's real lifetime USD value from `onchain`
 * (`portfolioValueUsd`, or the `lifetimeValueUsd` alias). Returns null when the
 * API didn't return a value - callers render "-" rather than inventing one.
 */
export function lifetimeUsd(input: unknown): number | null {
  if (!input || typeof input !== "object") return null;
  const { onchain } = input as { onchain?: unknown };
  if (!onchain || typeof onchain !== "object") return null;
  const o = onchain as Record<string, unknown>;
  const value = o.portfolioValueUsd ?? o.lifetimeValueUsd;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Read a profile row's real per-channel reachability object when present. The
 * backend sets these booleans only from real signals; callers fall back to a
 * heuristic only when the object is absent.
 */
export function readChannels(input: unknown): {
  email?: boolean;
  inapp?: boolean;
  farcaster?: boolean;
  x?: boolean;
  telegram?: boolean;
  discord?: boolean;
} | null {
  if (!input || typeof input !== "object") return null;
  const { channels } = input as { channels?: unknown };
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) {
    return null;
  }
  return channels as Record<string, boolean>;
}

/**
 * Per-profile channel reachability, the ONE definition the whole app shares so
 * the Audience overview tiles and the campaign audience picker agree. Prefers the
 * server's `channels` booleans; when the response omits them, falls back to
 * presence: email = a present, non-synthetic email OR a ZK-verified wallet
 * identity; push = a connected wallet. This is why an imported contact with a
 * plain email counts as email-reachable even though `/audience/overview`'s strict
 * aggregate reads it as 0.
 */
export function profileReach(input: unknown): {
  email: boolean;
  push: boolean;
} {
  const obj =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const channels = readChannels(input);
  if (channels) {
    return { email: Boolean(channels.email), push: Boolean(channels.inapp) };
  }
  const { walletFull } = extractWalletFields(input);
  const rawEmail = typeof obj.email === "string" ? obj.email : undefined;
  const hasRealEmail = Boolean(rawEmail && !isSyntheticWalletEmail(rawEmail));
  const verified = obj.status === "verified";
  return {
    email: hasRealEmail || (verified && Boolean(walletFull)),
    push: Boolean(walletFull),
  };
}

const readString = (obj: Record<string, unknown> | null, key: string) => {
  if (!obj) return "";
  const value = obj[key];
  return typeof value === "string" ? value.trim() : "";
};

const sanitizeHandle = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
};

export function extractSocialHandles(input: unknown): SocialHandles {
  if (!input || typeof input !== "object") return {};
  const obj = input as Record<string, unknown>;
  const attributes = (obj.attributes &&
    typeof obj.attributes === "object" &&
    obj.attributes !== null &&
    !Array.isArray(obj.attributes)) as Record<string, unknown> | false;

  const root = attributes ? attributes : obj;
  const nestedSocials =
    root.socials &&
    typeof root.socials === "object" &&
    root.socials !== null &&
    !Array.isArray(root.socials)
      ? (root.socials as Record<string, unknown>)
      : null;
  const nestedIdentities =
    root.identities &&
    typeof root.identities === "object" &&
    root.identities !== null &&
    !Array.isArray(root.identities)
      ? (root.identities as Record<string, unknown>)
      : null;

  const ens =
    readString(root, "ens") ||
    readString(root, "ensName") ||
    readString(root, "ens_name") ||
    readString(nestedSocials, "ens") ||
    readString(nestedIdentities, "ens");

  const twitterRaw =
    readString(root, "twitter") ||
    readString(root, "twitterHandle") ||
    readString(root, "twitter_handle") ||
    readString(root, "x") ||
    readString(root, "xHandle") ||
    readString(nestedSocials, "twitter") ||
    readString(nestedSocials, "x");
  const twitter = sanitizeHandle(twitterRaw);

  const discord =
    readString(root, "discord") ||
    readString(root, "discordUsername") ||
    readString(root, "discord_username") ||
    readString(nestedSocials, "discord") ||
    readString(nestedIdentities, "discord");

  const telegramRaw =
    readString(root, "telegram") ||
    readString(root, "telegramHandle") ||
    readString(root, "telegram_handle") ||
    readString(nestedSocials, "telegram") ||
    readString(nestedIdentities, "telegram");
  const telegram = sanitizeHandle(telegramRaw);

  const next: SocialHandles = {};
  if (ens) next.ens = ens;
  if (twitter) next.twitter = twitter;
  if (discord) next.discord = discord;
  if (telegram) next.telegram = telegram;
  return next;
}

const normalizeChainKey = (raw: unknown) => {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
};

const Svg = ({
  children,
  viewBox,
  className,
}: {
  children: ReactElement | ReactElement[];
  viewBox: string;
  className?: string;
}) => {
  return (
    <svg
      viewBox={viewBox}
      className={className ?? "h-3.5 w-3.5"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
};

const EthereumIcon = () => (
  <Svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500">
    <path
      d="M12 2L6.2 12.1 12 15.4l5.8-3.3L12 2z"
      fill="currentColor"
      opacity="0.7"
    />
    <path d="M12 16.6l-5.8-3.3L12 22l5.8-8.7-5.8 3.3z" fill="currentColor" />
  </Svg>
);

const PolygonIcon = () => (
  <Svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-purple-500">
    <path
      d="M8.2 9.2l3.2-1.9 3.2 1.9v3.6l-3.2 1.9-3.2-1.9V9.2z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M14.6 12.8l3.2-1.9 3.2 1.9v3.6l-3.2 1.9-3.2-1.9v-3.6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M3.4 12.8l3.2-1.9 3.2 1.9v3.6L6.6 18.3l-3.2-1.9v-3.6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </Svg>
);

const OptimismIcon = () => (
  <Svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-red-500">
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path
      d="M9 8h3.6c2 0 3.4 1.3 3.4 3.2 0 2-1.4 3.3-3.5 3.3H9V8zm2.2 2v4.4h1.3c1 0 1.6-.7 1.6-2.2 0-1.3-.6-2.2-1.6-2.2h-1.3z"
      fill="white"
    />
  </Svg>
);

const BaseIcon = () => (
  <Svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-blue-500">
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path
      d="M10.2 7.8h3.2c2.1 0 3.6 1.3 3.6 3.2 0 1.1-.5 2-1.3 2.5.9.5 1.5 1.5 1.5 2.7 0 2.1-1.6 3.6-3.9 3.6h-3.1V7.8zm2.2 2v2.8h1.2c.8 0 1.4-.6 1.4-1.4 0-.8-.6-1.4-1.4-1.4h-1.2zm0 4.6v3.2h1.2c1 0 1.7-.7 1.7-1.6 0-1-.7-1.6-1.7-1.6h-1.2z"
      fill="white"
    />
  </Svg>
);

const ArbitrumIcon = () => (
  <Svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-sky-500">
    <path
      d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4l8-4.6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M10.4 7.8l-2.8 8.4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M13.8 7.8l-2.8 8.4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M16.8 9.2l-2.3 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.5"
    />
  </Svg>
);

const SolanaIcon = () => (
  <Svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-500">
    <path
      d="M6 7.3c.3-.3.7-.5 1.1-.5h12.2c.4 0 .6.5.3.8l-1.2 1.2c-.3.3-.7.5-1.1.5H5.1c-.4 0-.6-.5-.3-.8L6 7.3z"
      fill="currentColor"
      opacity="0.85"
    />
    <path
      d="M6 12.1c.3-.3.7-.5 1.1-.5h12.2c.4 0 .6.5.3.8l-1.2 1.2c-.3.3-.7.5-1.1.5H5.1c-.4 0-.6-.5-.3-.8L6 12.1z"
      fill="currentColor"
      opacity="0.65"
    />
    <path
      d="M6 16.9c.3-.3.7-.5 1.1-.5h12.2c.4 0 .6.5.3.8l-1.2 1.2c-.3.3-.7.5-1.1.5H5.1c-.4 0-.6-.5-.3-.8L6 16.9z"
      fill="currentColor"
      opacity="0.45"
    />
  </Svg>
);

const BnbIcon = () => (
  <Svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-amber-500">
    <path d="M12 3l3.8 3.8L12 10.6 8.2 6.8 12 3z" fill="currentColor" />
    <path
      d="M6.8 8.2L10.6 12 6.8 15.8 3 12l3.8-3.8z"
      fill="currentColor"
      opacity="0.85"
    />
    <path
      d="M17.2 8.2L21 12l-3.8 3.8L13.4 12l3.8-3.8z"
      fill="currentColor"
      opacity="0.85"
    />
    <path
      d="M12 13.4l3.8 3.8L12 21l-3.8-3.8L12 13.4z"
      fill="currentColor"
      opacity="0.7"
    />
    <path d="M12 10.6l1.4 1.4L12 13.4 10.6 12 12 10.6z" fill="white" />
  </Svg>
);

export function getChainMeta(raw: unknown): ChainMeta | null {
  const key = normalizeChainKey(raw);
  if (!key) return null;
  if (key === "ethereum" || key === "eth" || key === "mainnet") {
    return { key: "ethereum", name: "Ethereum", icon: <EthereumIcon /> };
  }
  if (key === "polygon" || key === "matic") {
    return { key: "polygon", name: "Polygon", icon: <PolygonIcon /> };
  }
  if (key === "arbitrum" || key === "arb" || key === "arbitrum-one") {
    return { key: "arbitrum", name: "Arbitrum", icon: <ArbitrumIcon /> };
  }
  if (key === "optimism" || key === "op") {
    return { key: "optimism", name: "Optimism", icon: <OptimismIcon /> };
  }
  if (key === "base") {
    return { key: "base", name: "Base", icon: <BaseIcon /> };
  }
  if (key === "solana" || key === "sol") {
    return { key: "solana", name: "Solana", icon: <SolanaIcon /> };
  }
  if (
    key === "bsc" ||
    key === "bnb" ||
    key === "binance" ||
    key === "bnbchain"
  ) {
    return { key: "bnb", name: "BNB Chain", icon: <BnbIcon /> };
  }
  const fallbackName = raw && typeof raw === "string" ? raw.trim() : "Chain";
  if (fallbackName.length === 0) return null;
  return {
    key,
    name: fallbackName,
    icon: (
      <Svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-muted-foreground">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path
          d="M8 12h8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    ),
  };
}
