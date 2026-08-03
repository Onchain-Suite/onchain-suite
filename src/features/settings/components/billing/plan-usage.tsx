import { ChartBarIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";

import { isJsonObject } from "@/lib/utils";

import { fadeInUp, staggerContainer } from "../../utils";
import { PaygWalletCard } from "./payg-wallet-card";
import UpgradePlanDialog from "./upgrade-plan-dialog";
import { billingService } from "@/features/billing/billing.service";
import SettingsSectionCard from "@/features/settings/components/settings-section-card";
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

const formatDate = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
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

const PlanUsage = () => {
  const [isOpen, setIsOpen] = useState(false);
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
    enabled: isOpen,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Exact-plan fallback: GET /billing sometimes omits the plan name — the
  // dedicated GET /billing/plan endpoint is authoritative, so query it
  // whenever the overview can't name the plan (fixes "Unknown plan").
  const overviewHasPlanName = Boolean(
    pickString(
      typeof overviewQuery.data === "object" &&
        overviewQuery.data !== null &&
        "plan" in overviewQuery.data &&
        typeof (overviewQuery.data as Record<string, unknown>).plan === "string"
        ? (overviewQuery.data as Record<string, unknown>).plan
        : undefined,
      isJsonObject(overviewQuery.data) &&
        isJsonObject((overviewQuery.data as Record<string, unknown>).plan)
        ? (
            (overviewQuery.data as Record<string, unknown>).plan as Record<
              string,
              unknown
            >
          ).name
        : undefined
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
  const overviewData: unknown = overviewQuery.data;
  const overview = isJsonObject(overviewData) ? overviewData : {};
  const planObject = isJsonObject(overview.plan) ? overview.plan : undefined;
  const usageSummary = isJsonObject(overview.usage)
    ? overview.usage
    : undefined;
  const paymentMethod = isJsonObject(overview.paymentMethod)
    ? overview.paymentMethod
    : undefined;
  const planData: unknown = planQuery.data;
  const planRoot = isJsonObject(planData) ? planData : {};
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
  const nextBillingDate = formatDate(overview.nextBillingDate);
  const usageData: unknown = usageQuery.data;
  const usageRoot = isJsonObject(usageData) ? usageData : {};
  const usageItemsRaw = Array.isArray(usageRoot.items)
    ? usageRoot.items
    : undefined;
  const usageItems = Array.isArray(usageItemsRaw)
    ? usageItemsRaw
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
          used: pickNumber(usageRoot.onChainSends, usageSummary?.onChainSends),
          limit: pickNumber(
            isJsonObject(usageRoot.limits)
              ? usageRoot.limits.onChainSends
              : undefined,
            isJsonObject(usageSummary?.limits)
              ? usageSummary.limits.onChainSends
              : undefined
          ),
        },
        {
          key: "Tracked wallets",
          used: pickNumber(
            isJsonObject(usageRoot.meters) &&
              isJsonObject(usageRoot.meters.trackedWallets)
              ? usageRoot.meters.trackedWallets.used
              : undefined
          ),
          limit: pickNumber(
            isJsonObject(usageRoot.meters) &&
              isJsonObject(usageRoot.meters.trackedWallets)
              ? usageRoot.meters.trackedWallets.limit
              : undefined
          ),
        },
        // limit === -1 is the backend's unlimited convention — keep those.
      ].filter(
        (item) => item.used > 0 || (item.limit ?? 0) > 0 || item.limit === -1
      );
  const paymentMethodLabel = paymentMethod
    ? [
        pickString(paymentMethod.brand),
        pickString(paymentMethod.last4)
          ? `ending in ${pickString(paymentMethod.last4)}`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    : null;
  const hasBillingDetails =
    billingStatus !== "" ||
    nextBillingDate !== null ||
    paymentMethodLabel !== null;

  return (
    <motion.section
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <SettingsSectionCard
        title="Plan & usage"
        description="Review your current billing plan and monthly usage."
        icon={<ChartBarIcon className="h-5 w-5" aria-hidden="true" />}
        badge={`Current plan: ${planName}`}
        onOpenChange={setIsOpen}
        collapsedPreview={
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Status
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {billingStatus || "Not available"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Billing cycle
              </p>
              <p className="mt-1 text-sm text-foreground">
                {billingCycle || "Not available"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Next billing
              </p>
              <p className="mt-1 text-sm text-foreground">
                {nextBillingDate ?? "Not scheduled"}
              </p>
            </div>
          </div>
        }
      >
        <motion.div variants={fadeInUp} className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">
                Plan optimization
              </div>
              <div className="mt-1 space-y-2 text-sm text-muted-foreground">
                <p>
                  You&apos;re currently on the{" "}
                  <span className="font-medium text-primary">{planName}</span>{" "}
                  plan.
                </p>
                {hasBillingDetails && (
                  <div className="space-y-1">
                    {billingStatus ? <p>Status: {billingStatus}</p> : null}
                    {nextBillingDate ? (
                      <p>Next billing date: {nextBillingDate}</p>
                    ) : null}
                    {paymentMethodLabel ? (
                      <p>Payment method: {paymentMethodLabel}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UpgradePlanDialog currentPlan={planName} />
            </div>
          </div>

          <PaygWalletCard planName={planName} />

          {overviewQuery.isLoading || (isOpen && usageQuery.isLoading) ? (
            <div className="grid gap-6 sm:grid-cols-3 lg:gap-8">
              {["emails", "contacts", "onchain"].map((key) => (
                <div
                  key={key}
                  className="flex flex-col items-center rounded-2xl border border-border/60 bg-card p-6 lg:p-8"
                >
                  <Skeleton className="h-28 w-28 rounded-full lg:h-32 lg:w-32" />
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : isFreeFallback ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
              You’re on the Free plan. Upgrade to unlock billing features and
              usage tracking.
            </div>
          ) : overviewQuery.isError || (isOpen && usageQuery.isError) ? (
            <div className="py-8 text-center text-muted-foreground">
              Failed to load billing usage.
            </div>
          ) : !isOpen ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
              Expand this section to load live usage metrics.
            </div>
          ) : usageItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
              No usage metrics are available for this billing period yet.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {usageItems.slice(0, 4).map((quota, idx: number) => {
                const quotaObj = isJsonObject(quota) ? quota : {};
                const used = Number(quotaObj.used ?? 0);
                const limit =
                  quotaObj.limit !== undefined ? Number(quotaObj.limit) : null;
                const unlimited = limit === -1;
                const percent =
                  !unlimited && limit && limit > 0
                    ? Math.min(100, Math.round((used / limit) * 100))
                    : 0;
                const label = String(quotaObj.key ?? "Usage");
                const colorClass = idx === 2 ? "text-chart-2" : "text-primary";
                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex flex-col items-center rounded-2xl border border-border/60 bg-card p-6 lg:p-8"
                  >
                    <div className="relative h-28 w-28 lg:h-32 lg:w-32">
                      <svg
                        className="h-full w-full -rotate-90"
                        viewBox="0 0 36 36"
                      >
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          className="text-muted-foreground/20"
                          strokeWidth="2"
                        />
                        <motion.path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          className={colorClass}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray={`${percent}, 100`}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-semibold text-foreground">
                          {unlimited ? "∞" : `${percent}%`}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="font-medium text-foreground">{label}</div>
                      <div className="text-sm text-muted-foreground">
                        {used.toLocaleString()}
                        {unlimited
                          ? " / Unlimited"
                          : limit && limit > 0
                            ? ` / ${limit.toLocaleString()}`
                            : ""}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </SettingsSectionCard>
    </motion.section>
  );
};

export default PlanUsage;
