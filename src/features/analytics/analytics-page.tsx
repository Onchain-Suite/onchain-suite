"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

import { AutomationStatsView } from "@/features/automation/components/automation-stats-view";
import { CampaignStatsView } from "@/features/campaigns/components/analytics/campaign-stats-view";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * Analytics. Two parallel workspace-wide reports - campaigns and automations -
 * each the same reading: emails captured, delivered, company domains, open rate,
 * CTR, completion and still-running, with per-entity breakdowns. Both are
 * server-aggregated (campaigns/analytics/*, automations/metrics/*), so the page
 * is a thin shell over the two stats views rather than a data surface of its own.
 *
 * The active tab lives in `?tab=` so a link can open either report directly;
 * anything but "automations" falls back to the campaigns report.
 */

type AnalyticsTab = "campaigns" | "automations";

const TABS: { value: AnalyticsTab; label: string }[] = [
  { value: "campaigns", label: "Campaigns" },
  { value: "automations", label: "Automations" },
];

function AnalyticsTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: AnalyticsTab =
    searchParams?.get("tab") === "automations" ? "automations" : "campaigns";

  const onTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value === "campaigns") params.delete("tab");
      else params.set("tab", value);
      const qs = params.toString();
      router.replace(
        qs ? `${PRIVATE_ROUTES.ANALYTICS}?${qs}` : PRIVATE_ROUTES.ANALYTICS,
        {
          scroll: false,
        }
      );
    },
    [router, searchParams]
  );

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="w-full gap-6">
      <TabsList>
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="campaigns">
        <CampaignStatsView />
      </TabsContent>
      <TabsContent value="automations">
        <AutomationStatsView />
      </TabsContent>
    </Tabs>
  );
}

export function AnalyticsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace-wide performance across your campaigns and automations.
          </p>
        </div>
      </div>

      {/* useSearchParams needs a Suspense boundary during static render. */}
      <Suspense fallback={null}>
        <AnalyticsTabs />
      </Suspense>
    </div>
  );
}

export default AnalyticsPage;
