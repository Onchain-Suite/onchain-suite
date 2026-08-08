"use client";

import { ArrowUpRightIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";

import { isJsonObject } from "@/lib/utils";

import { PaygWalletCard } from "./payg-wallet-card";
import UpgradePlanDialog from "./upgrade-plan-dialog";
import { billingService } from "@/features/billing/billing.service";
import {
  SettingsCard,
  StatTile,
  StatusPill,
  UsageMeter,
} from "@/features/settings/components/settings-card";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
};

/** Catalog slugs → display names (docs/backend.md 2026-07-25 lineup). */
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  payg: "Pay as you go",
  pay_as_you_go: "Pay as you go",
  launch: "Launch",
  growth: "Growth",
  pro: "Pro",
  free: "Free (legacy)",
  starter: "Starter (legacy)",
  pro_plus: "Pro Plus (legacy)",
};

const displayPlanName = (raw: string): string => {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (PLAN_DISPLAY_NAMES[key]) return PLAN_DISPLAY_NAMES[key];
  const trimmed = raw.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

interface UsageRow {
  key: string;
  used: number;
  limit: number | null;
}

const PlanUsage = () => {
  const overviewQuery = useQuery({
    queryKey: ["billing", "overview"],
    queryFn: () => billingService.getOverview(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const usageQuery = useQuery({
    queryKey: ["billing", "usage", "month"],
    queryFn: () => billingService.getUsage({ period: "month" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Exact-plan fallback: GET /billing sometimes omits the plan name - the
  // dedicated GET /billing/plan endpoint is authoritative, so query it whenever
  // the overview can't name the plan (fixes "Unknown plan").
  const overviewObj = isJsonObject(overviewQuery.data)
    ? overviewQuery.data
    : undefined;
  const overviewPlanObj = isJsonObject(overviewObj?.plan)
    ? overviewObj.plan
    : undefined;
  const overviewHasPlanName = Boolean(
    pickString(
      typeof overviewObj?.plan === "string" ? overviewObj.plan : undefined,
      overviewPlanObj?.name
    )
  );
  const planQuery = useQuery({
    queryKey: ["billing", "plan"],
    queryFn: () => billingService.getPlan(),
    enabled: overviewQuery.isFetched && !overviewHasPlanName,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const overviewErrorMessage = String(
    overviewQuery.error instanceof Error ? overviewQuery.error.message : ""
  ).toLowerCase();
  const isFreeFallback =
    overviewQuery.isError &&
    overviewErrorMessage.includes("billing is not available");

  const overview = overviewObj ?? {};
  const planObject = overviewPlanObj;
  const usageSummary = isJsonObject(overview.usage)
    ? overview.usage
    : undefined;
  const planRoot = isJsonObject(planQuery.data) ? planQuery.data : {};
  const planRootPlan = isJsonObject(planRoot.plan) ? planRoot.plan : undefined;
  const planRootCurrent = isJsonObject(planRoot.currentPlan)
    ? planRoot.currentPlan
    : undefined;

  const rawPlanName = pickString(
    typeof overview.plan === "string" ? overview.plan : undefined,
    planObject?.name,
    planObject?.slug,
    typeof planRoot.plan === "string" ? planRoot.plan : undefined,
    planRootPlan?.name,
    planRootPlan?.slug,
    planRootCurrent?.name,
    planRootCurrent?.slug,
    planRoot.name,
    planRoot.slug
  );
  const planName = rawPlanName
    ? displayPlanName(rawPlanName)
    : isFreeFallback
      ? "Free (legacy)"
      : planQuery.isLoading || !overviewQuery.isFetched
        ? "…"
        : "Pay as you go";

  const billingStatus = pickString(overview.status, planObject?.status);
  const billingCycle = pickString(overview.billingCycle, planObject?.interval);
  const rawPrice = pickString(
    typeof overview.price === "string" ? overview.price : undefined,
    typeof planObject?.price === "string" ? planObject.price : undefined,
    typeof planObject?.price === "number"
      ? String(planObject.price)
      : undefined,
    typeof planRootPlan?.price === "string" ? planRootPlan.price : undefined,
    typeof planRootCurrent?.price === "string"
      ? planRootCurrent.price
      : undefined
  );
  const intervalLabel =
    billingCycle.toLowerCase().startsWith("year") ||
    billingCycle.toLowerCase() === "annual"
      ? "yr"
      : "mo";
  const priceLabel = rawPrice
    ? rawPrice.startsWith("$")
      ? rawPrice
      : `$${rawPrice} / ${intervalLabel}`
    : null;
  const billingCycleLabel = billingCycle
    ? billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)
    : null;
  const statusTone: "success" | "danger" | "pending" = billingStatus
    .toLowerCase()
    .includes("active")
    ? "success"
    : billingStatus.toLowerCase().includes("past") ||
        billingStatus.toLowerCase().includes("cancel")
      ? "danger"
      : "pending";

  const usageRoot = isJsonObject(usageQuery.data) ? usageQuery.data : {};
  const usageItemsRaw = Array.isArray(usageRoot.items)
    ? usageRoot.items
    : undefined;
  const usageItems: UsageRow[] = (
    Array.isArray(usageItemsRaw)
      ? usageItemsRaw.map((item) => {
          const obj: Record<string, unknown> = isJsonObject(item) ? item : {};
          return {
            key: pickString(obj.key, obj.label) || "Usage",
            used: pickNumber(obj.used),
            limit: obj.limit !== undefined ? pickNumber(obj.limit) : null,
          } satisfies UsageRow;
        })
      : [
          {
            key: "Emails sent",
            used: pickNumber(usageRoot.emailsSent, usageSummary?.emailsSent),
            limit: pickNumber(
              isJsonObject(usageRoot.limits)
                ? usageRoot.limits.emailsSent
                : undefined,
              isJsonObject(usageSummary?.limits)
                ? usageSummary.limits.emailsSent
                : undefined
            ),
          },
          {
            key: "Contacts",
            used: pickNumber(usageRoot.contacts, usageSummary?.contacts),
            limit: pickNumber(
              isJsonObject(usageRoot.limits)
                ? usageRoot.limits.contacts
                : undefined,
              isJsonObject(usageSummary?.limits)
                ? usageSummary.limits.contacts
                : undefined
            ),
          },
          {
            key: "On-chain sends",
            used: pickNumber(
              usageRoot.onChainSends,
              usageSummary?.onChainSends
            ),
            limit: pickNumber(
              isJsonObject(usageRoot.limits)
                ? usageRoot.limits.onChainSends
                : undefined,
              isJsonObject(usageSummary?.limits)
                ? usageSummary.limits.onChainSends
                : undefined
            ),
          },
        ]
  ).filter(
    (item) => item.used > 0 || (item.limit ?? 0) > 0 || item.limit === -1
  );

  const usageLoading = overviewQuery.isLoading || usageQuery.isLoading;

  return (
    <SettingsCard
      title="Plan & usage"
      description="Current plan, what's left this cycle, and what happens beyond it"
      action={
        <UpgradePlanDialog
          currentPlan={planName}
          trigger={
            <Button variant="outline" size="sm">
              <ArrowUpRightIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Change plan
            </Button>
          }
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Plan">{planName}</StatTile>
        <StatTile label="Price">{priceLabel ?? "-"}</StatTile>
        <StatTile label="Billing">{billingCycleLabel ?? "-"}</StatTile>
        <StatTile label="Status">
          {billingStatus ? (
            <StatusPill tone={statusTone}>
              {billingStatus.charAt(0).toUpperCase() + billingStatus.slice(1)}
            </StatusPill>
          ) : (
            "-"
          )}
        </StatTile>
      </div>

      {usageLoading ? (
        <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {["a", "b", "c"].map((k) => (
            <div key={k} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : isFreeFallback ? (
        <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
          You&apos;re on the Free plan. Upgrade to unlock usage tracking.
        </div>
      ) : overviewQuery.isError || usageQuery.isError ? (
        <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
          Failed to load billing usage.
        </div>
      ) : usageItems.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
          No usage metrics for this billing period yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {usageItems.map((item) =>
            item.limit === -1 || item.limit === null ? (
              <div key={item.key} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-muted-foreground">
                    {item.key}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-foreground">
                    <span className="font-semibold">
                      {item.used.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      {item.limit === -1 ? " / Unlimited" : ""}
                    </span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted" />
              </div>
            ) : (
              <UsageMeter
                key={item.key}
                label={item.key}
                used={item.used}
                limit={item.limit}
              />
            )
          )}
        </div>
      )}

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
        <ShieldCheckIcon
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
        />
        <p>
          Running out never cuts you off. Past the allowance - or past expiry -
          usage bills from your prepaid wallet at the rates below. Renewal
          reminders go out 4, 2, 1 days before expiry.
        </p>
      </div>

      <div className="mt-6">
        <PaygWalletCard planName={planName} />
      </div>
    </SettingsCard>
  );
};

export default PlanUsage;
