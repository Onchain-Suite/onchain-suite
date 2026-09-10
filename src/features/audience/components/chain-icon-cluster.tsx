import { cn } from "@/lib/utils";

import { type ChainVisual, chainVisual } from "../utils";

/** Icons overlap this much (px); the negative margin on every chip but the
 *  first pulls each one partly behind its neighbour, the way Formo stacks them. */
const OVERLAP = 6;

interface ChainChipProps {
  visual: ChainVisual;
  /** Layered chips render slightly behind the one before; higher = in front. */
  z: number;
  overlap: boolean;
}

function ChainChip({ visual, z, overlap }: ChainChipProps) {
  return (
    <span
      title={visual.label}
      style={{
        backgroundColor: visual.color,
        marginLeft: overlap ? -OVERLAP : 0,
        zIndex: z,
      }}
      className="inline-flex size-5 items-center justify-center rounded-full text-[8px] font-bold tracking-tight text-white ring-2 ring-background"
    >
      {visual.abbr}
    </span>
  );
}

interface ChainIconClusterProps {
  /** Raw chain values (slugs/names) for one wallet. */
  chains: string[];
  /** Show at most this many chips; the rest collapse into a "+N" chip. */
  max?: number;
  className?: string;
}

/**
 * The Chains column's cell: an overlapping cluster of chain chips for one
 * wallet. Renders a curated brand-colored chip per chain (initials fallback for
 * uncurated chains), de-duplicated by resolved label so "eth" and "eth-mainnet"
 * collapse to one Ethereum chip. Nothing to show → an em dash, matching the
 * other empty cells.
 */
export function ChainIconCluster({
  chains,
  max = 4,
  className,
}: ChainIconClusterProps) {
  const seen = new Set<string>();
  const visuals: ChainVisual[] = [];
  for (const raw of chains) {
    const v = chainVisual(raw);
    if (!v || seen.has(v.label)) continue;
    seen.add(v.label);
    visuals.push(v);
  }

  if (visuals.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  const shown = visuals.slice(0, max);
  const overflow = visuals.length - shown.length;

  return (
    <span
      className={cn("inline-flex items-center", className)}
      aria-label={`Active on ${visuals.map((v) => v.label).join(", ")}`}
    >
      {shown.map((v, i) => (
        <ChainChip
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
