"use client";

import { BeakerIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";

import {
  expectedHoldoutFraction,
  heldFromEligible,
  holdoutActive,
  isMeasurable,
} from "../../utils/holdout";
import { holdoutService } from "@/features/settings/holdout.service";

interface HoldoutNoteProps {
  /** The eligible audience estimate for this campaign (null while unknown). */
  eligible: number | null;
}

/**
 * Tells the sender that a random control group is being withheld from this
 * campaign (so its lift can be measured) and whether the audience is large
 * enough to resolve one. Renders nothing when the org has no holdout configured,
 * so a workspace that never opts in never sees it.
 */
export function HoldoutNote({ eligible }: HoldoutNoteProps) {
  const policyQuery = useQuery({
    queryKey: ["organization", "settings", "holdout"],
    queryFn: () => holdoutService.getSettings(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const policy = policyQuery.data;
  if (!policy || !holdoutActive(policy)) return null;

  const pct = Math.round(expectedHoldoutFraction(policy) * 100);
  const held =
    typeof eligible === "number" ? heldFromEligible(eligible, policy) : null;
  const measurable =
    typeof eligible === "number" &&
    isMeasurable(eligible, policy.singleCampaignFloor);

  return (
    <div className="flex gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-700 dark:text-sky-300">
      <BeakerIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <div className="space-y-1">
        <p>
          {held !== null ? (
            <>
              About{" "}
              <span className="font-semibold">{held.toLocaleString()}</span>{" "}
              wallets ({pct}% of this audience) are held back as a control and
              won&apos;t be messaged, so you can measure this campaign&apos;s
              lift.
            </>
          ) : (
            <>
              {pct}% of this audience is held back at random as a control and
              won&apos;t be messaged, so you can measure this campaign&apos;s
              lift.
            </>
          )}
        </p>
        {typeof eligible === "number" ? (
          <p className="text-xs opacity-80">
            {measurable
              ? "Your audience is large enough to resolve a clear lift."
              : `Below about ${policy.singleCampaignFloor.toLocaleString()} eligible, so the lift may come back inconclusive.`}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default HoldoutNote;
