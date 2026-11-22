"use client";

import { UserRemove01Icon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";

import { campaignsService } from "../../campaigns.service";
import { preflightLines } from "../../utils/send-preflight";
import { Icon } from "@/shared/components/common/hugeicon";

/**
 * The review step's "who actually gets this" line, from
 * `GET /campaigns/:id/send-preflight`: the audience after suppression and the
 * unengaged contacts the sunset policy skips. Renders nothing until (or
 * unless) the preflight answers, so a slow or failed call never blocks the
 * send button.
 */
export function SendPreflightNote({ campaignId }: { campaignId: string }) {
  const query = useQuery({
    queryKey: ["campaigns", campaignId, "send-preflight"],
    queryFn: () => campaignsService.getSendPreflight(campaignId),
    enabled: campaignId.length > 0,
    retry: false,
    staleTime: 30_000,
  });

  const lines = preflightLines(query.data);
  if (!lines.reach && !lines.unengaged) return null;

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-3 text-sm">
      <Icon
        icon={UserRemove01Icon}
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <div className="space-y-1">
        {lines.reach ? <p className="text-foreground">{lines.reach}</p> : null}
        {lines.unengaged ? (
          <p className="text-muted-foreground">
            {lines.unengaged}: no engagement in 180 days, or 11 sends in a row
            without one.
          </p>
        ) : null}
        {lines.includingUnengaged ? (
          <p className="text-amber-700 dark:text-amber-400">
            Unengaged contacts are included in this send.
          </p>
        ) : null}
      </div>
    </div>
  );
}
