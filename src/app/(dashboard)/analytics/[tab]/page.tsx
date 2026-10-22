import { AnalyticsDashboard } from "@/features/analytics/analytics-dashboard";

export const dynamic = "force-dynamic";

/**
 * `/analytics/<dash>`: a built-in tab (overview, conversions, engagement,
 * retention), `all` for every dashboard, or a custom dashboard's id. Custom
 * dashboards are looked up client-side, so an unknown id shows the dashboard's
 * own "not found" state rather than a 404.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  return <AnalyticsDashboard dash={tab} />;
}
