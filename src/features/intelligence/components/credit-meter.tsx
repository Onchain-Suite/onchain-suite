"use client";

import { BoltIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { getSelectedOrganizationId } from "@/lib/utils";

import { billingService } from "@/features/billing/billing.service";

const compact = (n: number) => {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
};

// circular progress geometry
const SIZE = 42;
const STROKE = 3.5;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/**
 * AI credit meter, rendered as a compact circular usage ring with the AI
 * icon at its center. Reads the org's `meters.aiCredits` from
 * `GET /billing/plan-usage/:organizationId` - the weighted meter that gates
 * the assistant, SQL generation, suggestions and the MCP agent (402
 * AI_CREDITS_EXCEEDED). Numeric usage and remaining credits surface on hover.
 * Refreshes when other intelligence requests invalidate the
 * ["intelligence","credits"] key prefix.
 */
export function CreditMeter() {
  const orgId = getSelectedOrganizationId();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["intelligence", "credits", orgId],
    queryFn: () => billingService.getPlanUsage(orgId ?? undefined),
    enabled: orgId !== null,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="h-[42px] w-[42px] animate-pulse rounded-full border border-border bg-card" />
    );
  }
  const meter = data?.meters?.aiCredits;
  if (isError || !meter) return null;

  const used = Math.max(0, Number(meter.used) || 0);
  const rawLimit = Number(meter.limit);
  // limit === -1 is the backend's unlimited convention (internal plan,
  // env-raised allowances) - never render it as exhausted.
  const unlimited = rawLimit === -1;
  const limit = unlimited ? 0 : Math.max(0, rawLimit || 0);
  const remaining = Math.max(0, limit - used);
  const percent = unlimited
    ? 0
    : typeof meter.percent === "number" && Number.isFinite(meter.percent)
      ? Math.min(100, Math.max(0, meter.percent))
      : limit > 0
        ? Math.min(100, (used / limit) * 100)
        : 0;

  const status = unlimited
    ? "ok"
    : meter.status === "warn" || meter.status === "exceeded"
      ? meter.status
      : "ok";
  const tone =
    status === "exceeded"
      ? {
          stroke: "stroke-rose-500",
          icon: "text-rose-500",
          ring: "border-rose-500/40",
          text: "text-rose-600 dark:text-rose-400",
        }
      : status === "warn"
        ? {
            stroke: "stroke-amber-500",
            icon: "text-amber-500",
            ring: "border-amber-500/40",
            text: "text-amber-600 dark:text-amber-400",
          }
        : {
            stroke: "stroke-primary",
            icon: "text-primary",
            ring: "border-border",
            text: "text-foreground",
          };

  const dash = (percent / 100) * C;

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={
              unlimited
                ? `AI credits: ${compact(used)} used, unlimited plan`
                : `AI credits: ${compact(used)} of ${compact(limit)} used`
            }
            className={`relative grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border bg-card transition-colors hover:bg-muted/40 ${tone.ring}`}
          >
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="absolute inset-0 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                strokeWidth={STROKE}
                className="stroke-muted"
              />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C - dash}`}
                className={`${tone.stroke} transition-[stroke-dasharray] duration-500`}
              />
            </svg>
            <BoltIcon className={`h-4 w-4 ${tone.icon}`} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">AI credits</span>
            <span className={`font-semibold tabular-nums ${tone.text}`}>
              {unlimited
                ? `${compact(used)} / Unlimited`
                : `${compact(used)} / ${compact(limit)}`}
            </span>
          </div>
          <p className="mt-1">
            {unlimited
              ? "Unlimited plan - no monthly cap."
              : status === "exceeded"
                ? "Limit reached - upgrade to continue."
                : `${compact(remaining)} credits remaining this month.`}
          </p>
          <p className="mt-1 text-muted-foreground">
            Used by AI chat, SQL generation, query suggestions and the MCP
            agent. Running saved SQL against your own data is free.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default CreditMeter;
