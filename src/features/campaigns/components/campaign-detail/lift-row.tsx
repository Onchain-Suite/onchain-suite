"use client";

import { BeakerIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";

import { campaignsService } from "../../campaigns.service";
import { fmtPts, liftTone } from "../../utils/holdout";

const fmtRate = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

const TONE_CLASS = {
  positive:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  negative: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  neutral: "border-border bg-card text-foreground",
} as const;

/**
 * The treated-vs-held conversion lift for a sent campaign, measured against its
 * control group. Renders an honest empty/explanatory state when there is no
 * conversion goal or no holdout, so the sender always knows why a number is or
 * isn't there.
 */
export function LiftRow({ campaignId }: { campaignId: string }) {
  const liftQuery = useQuery({
    queryKey: ["campaigns", "lift", campaignId],
    queryFn: () => campaignsService.getCampaignLift(campaignId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const lift = liftQuery.data;
  // Stay quiet while loading or on error - lift is a bonus panel, not core.
  if (liftQuery.isPending || liftQuery.isError || !lift) return null;

  // No goal: the goal picker already prompts for one; don't double up here.
  if (!lift.hasGoal) return null;

  if (!lift.hasHoldout) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">
        <BeakerIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
        <p>
          No control group was held back for this campaign, so its lift
          can&apos;t be measured. Turn on a holdout in Settings to measure
          future campaigns.
        </p>
      </div>
    );
  }

  const tone = liftTone(lift.verdict, lift.points);
  const rates = (
    <>
      treated {fmtRate(lift.treatedRate)} vs {fmtRate(lift.heldRate)} held
    </>
  );

  let headline: React.ReactNode;
  if (lift.verdict === "significant") {
    headline = (
      <>
        This campaign {lift.points >= 0 ? "lifted" : "lowered"}{" "}
        <span className="font-semibold">{lift.goal.name}</span> by{" "}
        <span className="font-semibold">{fmtPts(lift.points)}</span>
        {lift.ratio > 0 ? ` (${lift.ratio.toFixed(1)}x the held rate)` : ""}.
      </>
    );
  } else if (lift.verdict === "inconclusive") {
    headline = (
      <>
        No clear lift yet for{" "}
        <span className="font-semibold">{lift.goal.name}</span>:{" "}
        {fmtPts(lift.points)}, not statistically significant (p=
        {lift.p.toFixed(2)}).
      </>
    );
  } else {
    headline = (
      <>
        Too early to tell for{" "}
        <span className="font-semibold">{lift.goal.name}</span>: so far{" "}
        {fmtPts(lift.points)}. Need about {lift.needed.toLocaleString()} in the
        audience to resolve a {lift.mde.toFixed(1)}pt effect.
      </>
    );
  }

  return (
    <div className={cn("rounded-2xl border p-4 text-sm", TONE_CLASS[tone])}>
      <div className="flex items-start gap-3">
        <BeakerIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p>{headline}</p>
          <p className="text-xs opacity-80">
            {rates} · {lift.treated.n.toLocaleString()} messaged,{" "}
            {lift.held.n.toLocaleString()} held back.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LiftRow;
