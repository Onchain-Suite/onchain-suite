import type { Metadata } from "next";

import { PublicDashboard } from "@/features/analytics/components/dashboards/public-dashboard";
import { PublishedFooter } from "@/features/common/branding/published-footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard · OnchainSuite",
  robots: { index: false, follow: false },
};

/** A published analytics dashboard: read-only, outside the app shell. */
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      <PublicDashboard token={token} />
      <PublishedFooter />
    </>
  );
}
