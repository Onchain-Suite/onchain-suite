"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  formatOpenRange,
  formatRate,
  type HumanStats,
  OPEN_RANGE_EXPLANATION,
} from "../../utils/human-engagement";
import { Icon } from "@/shared/components/common/hugeicon";

const count = (v: number | null) => (v === null ? "-" : v.toLocaleString());

function Card({
  label,
  value,
  sub,
  hint,
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        {hint ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`About ${label.toLowerCase()}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon icon={InformationCircleIcon} className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{hint}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

/**
 * Email engagement, human first: clicks people made, then the open rate as a
 * range (Apple Mail Privacy Protection and bots make a single open number
 * unreliable), then Apple and machine opens on their own, and the raw open
 * count behind a disclosure. Renders nothing for older data without the
 * human-first fields; the caller keeps its raw numbers for that case.
 */
export function HumanEngagementStats({ stats }: { stats: HumanStats }) {
  const { humanClicks, humanClickRate, opens } = stats;
  if (humanClicks === null && humanClickRate === null && opens === null)
    return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card label="Human clicks" value={count(humanClicks)} />
        <Card
          label="Click rate"
          value={formatRate(humanClickRate)}
          sub="Clicks by people, of delivered"
          hint="Security scanners click every link to check it. Those clicks are taken out, so this is people clicking."
        />
        {opens ? (
          <Card
            label="Open rate"
            value={formatOpenRange(opens)}
            sub={`${opens.humanEstimateLow.toLocaleString()}-${opens.humanEstimateHigh.toLocaleString()} people`}
            hint={OPEN_RANGE_EXPLANATION}
          />
        ) : null}
      </div>
      {opens ? (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            Apple Mail opens: {opens.apple.toLocaleString()} (
            {formatRate(opens.rates.apple)})
          </span>
          <span>
            Machine opens: {opens.machine.toLocaleString()} (
            {formatRate(opens.rates.machine)})
          </span>
          <details className="group">
            <summary className="cursor-pointer select-none hover:text-foreground">
              Raw opens
            </summary>
            <span className="mt-1 block">
              {opens.raw.toLocaleString()} ({formatRate(opens.rates.raw)}),
              every open including Apple Mail and machines.
            </span>
          </details>
        </div>
      ) : null}
    </div>
  );
}
