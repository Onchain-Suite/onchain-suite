"use client";

import {
  ArrowUpRightIcon,
  CreditCardIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import ChangePlanDialog from "./change-plan-dialog";
import { PaygWalletCard } from "./payg-wallet-card";
import { UsageCostBreakdown } from "./usage-cost-breakdown";
import { UsageRows } from "./usage-rows";
import {
  billingService,
  type OrgSubscriptionResponse,
} from "@/features/billing/billing.service";
import {
  SettingsCard,
  StatTile,
  StatusPill,
} from "@/features/settings/components/settings-card";
import {
  usageBlockState,
  usageRows,
} from "@/features/settings/utils/usage-rows";
import { Button } from "@/shared/components/ui/button";

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
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

const toTitle = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

/**
 * Map the org's Stripe subscription lifecycle to a STATUS pill. Empty label
 * means "no Stripe subscription" (or the endpoint isn't deployed) so the caller
 * falls back to the legacy status. A scheduled cancel is still `active` with
 * `cancelAtPeriodEnd`, which reads "Canceling · ends <date>".
 */
const resolveSubscriptionStatus = (
  sub: OrgSubscriptionResponse | undefined
): {
  label: string;
  note?: string;
  tone?: "success" | "danger" | "pending";
} => {
  if (sub?.hasSubscription !== true) return { label: "" };
  const status = (sub.status ?? "").toLowerCase();
  const endsOn = formatDate(sub.currentPeriodEnd);
  if (
    sub.cancelAtPeriodEnd === true &&
    (status === "active" || status === "trialing")
  ) {
    return {
      label: "Canceling",
      note: endsOn ? `Ends ${endsOn}` : undefined,
      tone: "danger",
    };
  }
  switch (status) {
    case "active":
      return { label: "Active", tone: "success" };
    case "trialing":
      return { label: "Trialing", tone: "success" };
    case "past_due":
      return { label: "Past due", tone: "danger" };
    case "unpaid":
      return { label: "Unpaid", tone: "danger" };
    case "canceled":
      return { label: "Canceled", tone: "danger" };
    default:
      return { label: status ? toTitle(status) : "Active", tone: "pending" };
  }
};

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

  // GET /billing + GET /billing/plan are USER-level and can disagree with the
  // org's real plan after a Stripe subscribe (the webhook projects the plan
  // onto the org, not the user's Subscription row). The canonical per-ORG plan
  // is GET /billing/plan-usage/:org, so the Plan/Price/Billing cards read it
  // (falling back to the user-level values when no org is selected or it fails).
  const orgId = getSelectedOrganizationId();
  const planUsageQuery = useQuery({
    queryKey: ["billing", "plan-usage", orgId],
    queryFn: () => billingService.getPlanUsage(orgId ?? undefined),
    enabled: Boolean(orgId),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  // Org subscription lifecycle for the STATUS card + "cancels on <date>". The
  // endpoint is new; until it is deployed this 404s and the card falls back to
  // the legacy status, so a missing endpoint never breaks the panel.
  const subscriptionQuery = useQuery({
    queryKey: ["billing", "subscription", orgId],
    queryFn: () => billingService.getSubscription(orgId ?? undefined),
    enabled: Boolean(orgId),
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const planUsagePlan = isJsonObject(planUsageQuery.data?.plan)
    ? (planUsageQuery.data.plan as Record<string, unknown>)
    : undefined;
  const canonicalPlanKey = pickString(planUsagePlan?.key);
  const canonicalPlanLabel =
    pickString(planUsagePlan?.label) ||
    (canonicalPlanKey ? displayPlanName(canonicalPlanKey) : "");
  // null (not 0) when the field is absent - a canonical plan with a $0 base
  // (e.g. PAYG) must still show "$0 / mo", never the stale user-level price.
  const canonicalMonthlyPrice =
    typeof planUsagePlan?.monthlyPrice === "number" &&
    Number.isFinite(planUsagePlan.monthlyPrice)
      ? planUsagePlan.monthlyPrice
      : null;

  const orgSub = subscriptionQuery.data;

  const overviewErrorMessage = String(
    overviewQuery.error instanceof Error ? overviewQuery.error.message : ""
  ).toLowerCase();
  const isFreeFallback =
    overviewQuery.isError &&
    overviewErrorMessage.includes("billing is not available");

  const overview = overviewObj ?? {};
  const planObject = overviewPlanObj;
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
  const planName = canonicalPlanLabel
    ? canonicalPlanLabel
    : rawPlanName
      ? displayPlanName(rawPlanName)
      : isFreeFallback
        ? "Free (legacy)"
        : planQuery.isLoading ||
            !overviewQuery.isFetched ||
            planUsageQuery.isLoading
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
  const priceLabel =
    canonicalMonthlyPrice !== null
      ? `$${canonicalMonthlyPrice} / mo`
      : rawPrice
        ? rawPrice.startsWith("$")
          ? rawPrice
          : `$${rawPrice} / ${intervalLabel}`
        : null;
  // Suite/Send subscriptions bill monthly; show that whenever we have a plan.
  const billingCycleLabel = canonicalPlanLabel
    ? "Monthly"
    : billingCycle
      ? billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)
      : null;

  // STATUS card: prefer the org's Stripe subscription lifecycle (so a scheduled
  // cancel reads "Canceling · ends <date>"). Fall back to the legacy status for
  // orgs with no Stripe subscription (crypto/admin) or before the endpoint ships.
  const subLifecycle = resolveSubscriptionStatus(orgSub);
  const statusLabel = subLifecycle.label || toTitle(billingStatus);
  const statusNote = subLifecycle.note;
  const statusTone: "success" | "danger" | "pending" =
    subLifecycle.tone ??
    (billingStatus.toLowerCase().includes("active")
      ? "success"
      : billingStatus.toLowerCase().includes("past") ||
          billingStatus.toLowerCase().includes("cancel")
        ? "danger"
        : "pending");

  // The workspace's own meters (GET /billing/plan-usage/:org) when it has
  // them; the older user-level usage only when it does not.
  const usageItems = useMemo(
    () =>
      usageRows({
        meters: planUsageQuery.data?.meters,
        usage: usageQuery.data,
        overviewUsage: overviewObj?.usage,
      }),
    [planUsageQuery.data, usageQuery.data, overviewObj]
  );
  const usageState = usageBlockState({
    loading:
      overviewQuery.isLoading ||
      usageQuery.isLoading ||
      planUsageQuery.isLoading,
    rows: usageItems,
    freeFallback: isFreeFallback,
    failed: overviewQuery.isError || usageQuery.isError,
  });

  const [portalLoading, setPortalLoading] = useState(false);
  // Opens the Stripe Customer Portal, where the customer cancels, swaps card, or
  // views invoices. The backend derives the return URL from the request Origin,
  // so it comes back to this billing page.
  const openBillingPortal = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      const { url } = await billingService.billingPortal();
      if (url) {
        window.location.assign(url);
        return;
      }
      toast.error("Couldn't open billing management. Please try again.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't open billing management."
      );
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <SettingsCard
      title="Plan & usage"
      description="Current plan, what's left this cycle, and what happens beyond it"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openBillingPortal}
            disabled={portalLoading}
          >
            <CreditCardIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            {portalLoading ? "Opening…" : "Manage billing"}
          </Button>
          <ChangePlanDialog
            currentPlan={planName}
            trigger={
              <Button variant="outline" size="sm">
                <ArrowUpRightIcon
                  aria-hidden="true"
                  className="mr-1.5 h-4 w-4"
                />
                Change plan
              </Button>
            }
          />
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Plan">{planName}</StatTile>
        <StatTile label="Price">{priceLabel ?? "-"}</StatTile>
        <StatTile label="Billing">{billingCycleLabel ?? "-"}</StatTile>
        <StatTile label="Status">
          {statusLabel ? (
            <span className="flex flex-col gap-1">
              <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
              {statusNote ? (
                <span className="text-xs text-muted-foreground">
                  {statusNote}
                </span>
              ) : null}
            </span>
          ) : (
            "-"
          )}
        </StatTile>
      </div>

      <UsageRows state={usageState} rows={usageItems} />

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
        <UsageCostBreakdown />
      </div>

      <div className="mt-6">
        <PaygWalletCard planName={planName} />
      </div>
    </SettingsCard>
  );
};

export default PlanUsage;
