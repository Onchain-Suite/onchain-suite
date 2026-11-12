"use client";

import { useQuery } from "@tanstack/react-query";

import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import { billingService } from "../billing.service";
import type { CurrentPlanSize } from "../utils/plan-change";

const positive = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null;

/**
 * The size the workspace pays for now, and whether its subscription can be
 * changed in place: what the plan picker needs to offer a different size.
 *
 * Both reads use the billing tab's own query keys, so on that tab they are
 * already in the cache and this costs no request.
 *
 * The size is reported only once the SUBSCRIPTION read has answered. Until
 * then (still loading, or failed) it is not known whether the workspace
 * subscribes by card, and guessing "it does not" is the dangerous guess: the
 * picker would offer a subscriber a bigger size as an ordinary purchase, and
 * on a server that cannot resize, that purchase is a second subscription.
 * With no size the picker behaves as it did before it knew sizes at all.
 */
export function useCurrentPlanSize(): CurrentPlanSize {
  const orgId = getSelectedOrganizationId();
  const usage = useQuery({
    queryKey: ["billing", "plan-usage", orgId],
    queryFn: () => billingService.getPlanUsage(orgId ?? undefined),
    enabled: Boolean(orgId),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const subscription = useQuery({
    queryKey: ["billing", "subscription", orgId],
    queryFn: () => billingService.getSubscription(orgId ?? undefined),
    enabled: Boolean(orgId),
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const sub = subscription.data;
  if (!subscription.isSuccess || !sub) {
    return {
      units: null,
      hasSubscription: false,
      canResize: false,
      monthlyPrice: null,
      upgradeChargedNow: false,
    };
  }
  // `plan` is typed as a name but arrives as an object carrying the price.
  const plan: unknown = usage.data?.plan;
  return {
    // A subscription knows its own size; otherwise the plan's contact limit
    // is the size that was paid for.
    units:
      positive(sub.billedUnits) ??
      positive(sub.capacity) ??
      positive(usage.data?.meters?.contacts?.limit),
    hasSubscription: sub.hasSubscription === true,
    canResize: sub.canResize === true,
    monthlyPrice: isJsonObject(plan) ? positive(plan.monthlyPrice) : null,
    upgradeChargedNow: sub.upgradeChargedNow === true,
    paidThrough:
      typeof sub.planExpiresAt === "string" ? sub.planExpiresAt : null,
    paidTimeCredited: sub.paidTimeCredited === true,
  };
}
