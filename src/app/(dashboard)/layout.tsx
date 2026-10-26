import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ProtectedLayout } from "@/lib/guard";

import { DashboardLayout } from "@/features/common/layout/components/dashboard-layout";
import { AUTH_ROUTES, PRIVATE_ROUTES } from "@/shared/config/app-routes";

// The authenticated app must never be indexed — belt-and-suspenders behind the
// robots.txt disallow. (A 401 to Googlebot can't surface a noindex, but a page
// that is ever linked or briefly reachable is still kept out of the index here.)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the rail state here so the server renders the sidebar in the state the
  // user left it - reading the cookie on the client would flash the wrong width.
  // Default is COLLAPSED: the rail only expands when the user has explicitly
  // opened it before (cookie === "true").
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <ProtectedLayout
      requireOrganization
      redirectTo={`${AUTH_ROUTES.LOGIN}?redirectTo=${encodeURIComponent(PRIVATE_ROUTES.DASHBOARD)}`}
    >
      <DashboardLayout defaultSidebarOpen={sidebarOpen}>
        {children}
      </DashboardLayout>
    </ProtectedLayout>
  );
}
