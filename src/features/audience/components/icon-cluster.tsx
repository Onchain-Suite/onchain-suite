import { useState } from "react";

import { cn } from "@/lib/utils";

import type { WalletTokenChip } from "../audience.service";
import {
  chainLogoUrls,
  chainVisual,
  hashHue,
  type IconVisual,
  protocolVisual,
  resolveChainLabel,
} from "../utils";

/** Icons overlap this much (px); the negative margin on every chip but the
 *  first pulls each one partly behind its neighbour, the way Formo stacks them. */
const OVERLAP = 6;

interface IconChipProps {
  visual: IconVisual;
  /** Layered chips render slightly behind the one before; higher = in front. */
  z: number;
  overlap: boolean;
}

function IconChip({ visual, z, overlap }: IconChipProps) {
  // Ordered logo sources — e.g. a token's own logo, then its chain icon, then
  // nothing. Each failed <img> advances to the next; once they're exhausted the
  // chip falls back to the colored abbr, which is fully inline (no network).
  const urls = visual.logoUrls ?? [];
  const [idx, setIdx] = useState(0);
  const src = urls[idx];
  const showLogo = !!src;
  return (
    <span
      title={visual.label}
      style={{
        backgroundColor: showLogo ? "var(--background)" : visual.color,
        marginLeft: overlap ? -OVERLAP : 0,
        zIndex: z,
      }}
      className="inline-flex size-5 items-center justify-center overflow-hidden rounded-full text-[8px] font-bold tracking-tight text-white ring-2 ring-background"
    >
      {showLogo ? (
        // A 20px avatar from an external logo CDN — next/image can't optimize
        // cross-origin URLs without per-host remotePatterns, and the onError
        // cascade (next source, then the colored abbr) is the whole point here.
        // `key={src}` remounts on advance so onError re-fires for the new src.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={visual.label}
          className="size-full object-cover"
          onError={() => setIdx((i) => i + 1)}
        />
      ) : (
        visual.abbr
      )}
    </span>
  );
}

interface IconClusterProps {
  /** Resolved chips, already de-duplicated by the caller. */
  visuals: IconVisual[];
  /** Show at most this many chips; the rest collapse into a "+N" chip. */
  max?: number;
  /** Screen-reader lead-in, e.g. "Active on" / "Uses" / "Holds". */
  ariaVerb: string;
  className?: string;
}

/**
 * An overlapping cluster of on-chain icon chips for one wallet — the shared cell
 * body for the Chains, Apps, and Tokens columns. Renders up to `max` chips, then
 * a "+N" overflow chip; nothing to show → an em dash, matching the other empty
 * cells.
 */
export function IconCluster({
  visuals,
  max = 4,
  ariaVerb,
  className,
}: IconClusterProps) {
  if (visuals.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  const shown = visuals.slice(0, max);
  const overflow = visuals.length - shown.length;
  return (
    <span
      className={cn("inline-flex items-center", className)}
      aria-label={`${ariaVerb} ${visuals.map((v) => v.label).join(", ")}`}
    >
      {shown.map((v, i) => (
        <IconChip
          key={v.label}
          visual={v}
          z={visuals.length - i}
          overlap={i > 0}
        />
      ))}
      {overflow > 0 ? (
        <span
          title={visuals
            .slice(max)
            .map((v) => v.label)
            .join(", ")}
          style={{ marginLeft: -OVERLAP }}
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[9px] font-semibold text-muted-foreground ring-2 ring-background"
        >
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}

/** De-duplicate resolved visuals by label, preserving order. */
function resolveDistinct(
  raws: string[],
  resolve: (raw: string) => IconVisual | null
): IconVisual[] {
  const seen = new Set<string>();
  const out: IconVisual[] = [];
  for (const raw of raws) {
    const v = resolve(raw);
    if (!v || seen.has(v.label)) continue;
    seen.add(v.label);
    out.push(v);
  }
  return out;
}

/** Chains column: curated chain chips (initials fallback), deduped by label so
 *  "eth" and "eth-mainnet" collapse to one Ethereum chip. */
export function ChainIconCluster({
  chains,
  max,
  className,
}: {
  chains: string[];
  max?: number;
  className?: string;
}) {
  return (
    <IconCluster
      visuals={resolveDistinct(chains, chainVisual)}
      max={max}
      ariaVerb="Active on"
      className={className}
    />
  );
}

/** Apps column: curated DeFi protocol chips (initials fallback), deduped so a
 *  protocol's markets (aave_v2, aave_v3) collapse to one Aave chip. */
export function AppIconCluster({
  protocols,
  max,
  className,
}: {
  protocols: string[];
  max?: number;
  className?: string;
}) {
  return (
    <IconCluster
      visuals={resolveDistinct(protocols, protocolVisual)}
      max={max}
      ariaVerb="Uses"
      className={className}
    />
  );
}

/** Map a persisted token holding to a chip. Logo sources cascade: the token's
 *  own logo first, then its chain's icon — so WETH, a synthetic, or any token we
 *  have no distinct logo for shows the chain it lives on rather than a generic
 *  circle. Falls back to the ticker initials once both miss. Label prefers the
 *  symbol, then the name. */
function tokenVisual(token: WalletTokenChip): IconVisual | null {
  // First non-empty of symbol/name (an all-whitespace symbol must fall through
  // to the name, so this can't be `??`).
  const label = [token.symbol, token.name]
    .map((v) => v?.trim())
    .find((v): v is string => !!v && v.length > 0);
  if (!label) return null;
  const abbr = label
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();
  const chainLabel = resolveChainLabel(token.chain);
  const logoUrls = [
    ...(token.logoUrl ? [token.logoUrl] : []),
    ...(chainLabel ? chainLogoUrls(chainLabel) : []),
  ];
  return {
    label,
    abbr: abbr || "?",
    color: `hsl(${hashHue(label)} 58% 45%)`,
    logoUrls,
  };
}

/** Tokens column: token chips (logo image, colored-ticker fallback), kept in
 *  the backend's value-desc order and deduped by label. */
export function TokenIconCluster({
  tokens,
  max,
  className,
}: {
  tokens: WalletTokenChip[];
  max?: number;
  className?: string;
}) {
  const seen = new Set<string>();
  const visuals: IconVisual[] = [];
  for (const token of tokens) {
    const v = tokenVisual(token);
    if (!v || seen.has(v.label)) continue;
    seen.add(v.label);
    visuals.push(v);
  }
  return (
    <IconCluster
      visuals={visuals}
      max={max}
      ariaVerb="Holds"
      className={className}
    />
  );
}
