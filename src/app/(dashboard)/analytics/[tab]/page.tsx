import { notFound } from "next/navigation";

import { AnalyticsDashboard } from "@/features/analytics/analytics-dashboard";
import {
  ANALYTICS_TABS,
  type AnalyticsTab,
} from "@/features/analytics/analytics-tabs";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!ANALYTICS_TABS.includes(tab as AnalyticsTab)) notFound();
  return <AnalyticsDashboard activeTab={tab as AnalyticsTab} />;
}
