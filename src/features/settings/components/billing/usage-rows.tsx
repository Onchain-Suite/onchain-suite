import { UsageMeter } from "../settings-card";
import type {
  UsageBlockState,
  UsageRow,
} from "@/features/settings/utils/usage-rows";
import { Skeleton } from "@/shared/components/ui/skeleton";

const NOTICE: Partial<Record<UsageBlockState, string>> = {
  free: "You're on the Free plan. Upgrade to unlock usage tracking.",
  error: "Failed to load billing usage.",
  empty: "No usage metrics for this billing period yet.",
};

const GRID = "mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3";
const SKELETON_KEYS = ["a", "b", "c"] as const;

/**
 * The usage meters under the plan tiles. A meter with a limit draws a bar; one
 * the plan does not cap (a limit below zero) or has no known limit for shows
 * the amount alone.
 */
export function UsageRows({
  state,
  rows,
}: {
  state: UsageBlockState;
  rows: readonly UsageRow[];
}) {
  if (state === "loading") {
    return (
      <div className={GRID}>
        {SKELETON_KEYS.map((k) => (
          <div key={k} className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (state !== "rows") {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
        {NOTICE[state]}
      </div>
    );
  }

  return (
    <div className={GRID}>
      {rows.map((row) =>
        row.limit === null || row.limit < 0 ? (
          <div key={row.key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-muted-foreground">
                {row.label}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-foreground">
                <span className="font-semibold">
                  {row.used.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  {row.limit === null ? "" : " / Unlimited"}
                </span>
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted" />
          </div>
        ) : (
          <UsageMeter
            key={row.key}
            label={row.label}
            used={row.used}
            limit={row.limit}
          />
        )
      )}
    </div>
  );
}

export default UsageRows;
