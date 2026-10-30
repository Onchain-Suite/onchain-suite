import type { Metadata } from "next";

import { currentPublishedWorkspace } from "@/lib/published-workspace";

import { PublicDashboard } from "@/features/analytics/components/dashboards/public-dashboard";
import { PublishedFooter } from "@/features/common/branding/published-footer";

export const dynamic = "force-dynamic";

/** Title it as the workspace's when opened on its subdomain, else OnchainSuite. */
export async function generateMetadata(): Promise<Metadata> {
  const workspace = await currentPublishedWorkspace();
  return {
    title: workspace
      ? `Dashboard · ${workspace.name}`
      : "Dashboard · OnchainSuite",
    robots: { index: false, follow: false },
  };
}

/** A published analytics dashboard: read-only, outside the app shell. */
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const workspace = await currentPublishedWorkspace();
  return (
    <>
      <PublicDashboard token={token} workspace={workspace?.name ?? null} />
      <PublishedFooter />
    </>
  );
}
