import { cookies } from "next/headers";

import { ProtectedLayout } from "@/lib/guard";

import { DashboardLayout } from "@/features/common/layout/components/dashboard-layout";
import { AUTH_ROUTES, PRIVATE_ROUTES } from "@/shared/config/app-routes";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the rail state here so the server renders the sidebar in the state the
  // user left it - reading the cookie on the client would flash the wrong width.
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

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
