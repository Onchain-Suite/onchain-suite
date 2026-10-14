"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

import { AnalyticsOverview } from "./analytics-page";
import { ANALYTICS_TAB_DEFS, type AnalyticsTab } from "./analytics-tabs";

const TABS = ANALYTICS_TAB_DEFS;

/** What each not-yet-built tab will hold, shown as an honest empty state until
 *  its backend lands (see migration/analytics.md). */
const TAB_COMING: Record<Exclude<AnalyticsTab, "overview">, string> = {
  conversions:
    "How each channel's conversions are credited (direct vs influenced) and the attribution windows behind them. Needs on-chain conversion attribution.",
  engagement:
    "Off-chain and on-chain engagement breakdowns, the in-app push delivery funnel, and send-frequency fatigue. Needs org-wide aggregation endpoints.",
  retention:
    "Cohort retention, lifecycle stages and movement, and the retention curve for messaged vs never-messaged wallets. Needs cohort and lifecycle endpoints.",
};

/**
 * The Analytics dashboard shell: a top-level screen with URL-addressable tabs
 * (/analytics/<tab>). Overview is the real, wired analytics; the other tabs are
 * honest empty states until their data lands, built over the migration steps.
 */
export function AnalyticsDashboard({ activeTab }: { activeTab: AnalyticsTab }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Analytics
      </h1>

      <nav
        aria-label="Analytics views"
        className="flex gap-6 overflow-x-auto border-b border-border"
      >
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/analytics/${t.id}`}
            aria-current={activeTab === t.id ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors",
              activeTab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <AnalyticsOverview />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            {TABS.find((t) => t.id === activeTab)?.label}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {TAB_COMING[activeTab]}
          </p>
          <span className="mt-3 inline-flex rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            In migration
          </span>
        </div>
      )}
    </div>
  );
}
