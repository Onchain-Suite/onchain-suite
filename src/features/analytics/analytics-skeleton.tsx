const KPI_KEYS = ["k1", "k2", "k3", "k4"];
const TEMPLATE_KEYS = ["t1", "t2", "t3", "t4", "t5", "t6"];

/**
 * The true analytics body skeleton - a single shared source so the route-level
 * loading.tsx (shown during navigation) and the in-page loading state (shown
 * while the client query loads) render the identical layout. Mirrors the real
 * page: KPI strip → off-chain/on-chain pair → in-app push → report templates.
 */
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_KEYS.map((k) => (
          <div
            key={k}
            className="h-28 animate-pulse rounded-xl border border-border/60 bg-card/60"
          />
        ))}
      </div>
      {/* Off-chain + On-chain */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-44 animate-pulse rounded-xl border border-border/60 bg-card/60" />
        <div className="h-44 animate-pulse rounded-xl border border-border/60 bg-card/60" />
      </div>
      {/* In-app push delivery */}
      <div className="h-40 animate-pulse rounded-xl border border-border/60 bg-card/60" />
      {/* Report templates */}
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-card/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATE_KEYS.map((k) => (
            <div
              key={k}
              className="h-36 animate-pulse rounded-xl border border-border/60 bg-card/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
