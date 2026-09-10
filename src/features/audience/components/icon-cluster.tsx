import { useState } from "react";

import { cn } from "@/lib/utils";

import { chainVisual, type IconVisual, protocolVisual } from "../utils";

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
  // A chip with a logo shows the image and falls back to the colored abbr chip
  // if it fails to load (dead CDN link, missing token logo).
  const [broken, setBroken] = useState(false);
  const showLogo = !!visual.logoUrl && !broken;
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
        // A 20px avatar from an arbitrary token/protocol logo CDN — next/image
        // can't optimize cross-origin URLs without per-host remotePatterns, and
        // the onError → colored-abbr fallback is the whole point here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.logoUrl}
          alt={visual.label}
          className="size-full object-cover"
          onError={() => setBroken(true)}
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
