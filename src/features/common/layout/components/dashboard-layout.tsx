"use client";

import {
  BoltIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  MegaphoneIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import type { NavItem } from "@/components/layout/nav-utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { authClient } from "@/lib/auth-client";
import {
  getFullName,
  getSelectedOrganizationId,
  isJsonObject,
  isOrganizationConfirmed,
} from "@/lib/utils";

import { getBreadcrumbsForPath } from "./breadcrumbs";
import { ComingSoonSection } from "./coming-soon-section";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";
import { OrganizationStatusBanner } from "./organization-status-banner";
import { PendingCheckoutBanner } from "@/features/billing/components/pending-checkout-banner";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import {
  getWipSection,
  isWipHref,
  SHOW_WIP_SECTIONS,
} from "@/shared/config/wip-sections";

interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Persisted rail state, read from the sidebar cookie on the server. */
  defaultSidebarOpen?: boolean;
}

/** WIP sections stay in the nav but render faded and route to a coming-soon panel. */
const withWipFlags = (items: NavItem[]): NavItem[] =>
  items.map((item) => ({
    ...item,
    wip: !SHOW_WIP_SECTIONS && isWipHref(item.url),
  }));

// Resolved once at module scope — the routes and the WIP flag are both static.
const NAV_MAIN: NavItem[] = withWipFlags([
  { title: "Dashboard", url: PRIVATE_ROUTES.DASHBOARD, icon: Squares2X2Icon },
  { title: "Campaigns", url: PRIVATE_ROUTES.CAMPAIGNS, icon: MegaphoneIcon },
  { title: "Audience", url: PRIVATE_ROUTES.AUDIENCE, icon: UserGroupIcon },
  { title: "Forms", url: PRIVATE_ROUTES.FORMS, icon: DocumentTextIcon },
  { title: "Inbox", url: PRIVATE_ROUTES.INBOX, icon: EnvelopeIcon },
  { title: "Automations", url: PRIVATE_ROUTES.AUTOMATIONS, icon: BoltIcon },
  {
    title: "Intelligence",
    url: PRIVATE_ROUTES.INTELLIGENCE,
    icon: CpuChipIcon,
  },
]);

const NAV_SECONDARY: NavItem[] = withWipFlags([
  { title: "Settings", url: PRIVATE_ROUTES.SETTINGS, icon: Cog6ToothIcon },
]);

function DashboardLayoutInner({
  children,
  defaultSidebarOpen = true,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [isMounted, setIsMounted] = useState(false);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    setSelectedOrgId(getSelectedOrganizationId());
  }, [isMounted]);

  useEffect(() => {
    const onStart = (_e: Event) => {
      setIsSwitchingOrg(true);
      setSelectedOrgId(getSelectedOrganizationId());
    };
    const onDone = (_e: Event) => {
      setIsSwitchingOrg(false);
      setSelectedOrgId(getSelectedOrganizationId());
    };
    window.addEventListener("onchain:org-switch-start", onStart);
    window.addEventListener("onchain:org-changed", onDone);
    window.addEventListener("onchain:org-switch-failed", onDone);
    return () => {
      window.removeEventListener("onchain:org-switch-start", onStart);
      window.removeEventListener("onchain:org-changed", onDone);
      window.removeEventListener("onchain:org-switch-failed", onDone);
    };
  }, []);

  const activeOrganizationId = isMounted
    ? (session?.session?.activeOrganizationId ?? null)
    : null;
  const isConfirmedBySession = isMounted
    ? isOrganizationConfirmed(activeOrganizationId)
    : false;
  const hasActiveOrganization =
    isConfirmedBySession || (!!selectedOrgId && !isSwitchingOrg);

  const breadcrumbs = useMemo(
    () => getBreadcrumbsForPath(pathname ?? "/"),
    [pathname]
  );

  // Some accounts have no display name — fall back to first/last name the way
  // the campaigns page did before the shell was hoisted to the group layout.
  const rawUser: unknown = session?.user;
  const firstLast = isJsonObject(rawUser)
    ? getFullName(
        typeof rawUser.firstName === "string" ? rawUser.firstName : undefined,
        typeof rawUser.lastName === "string" ? rawUser.lastName : undefined
      )
    : "";
  const fullName = hasActiveOrganization
    ? (session?.user?.name ?? (firstLast.length > 0 ? firstLast : undefined))
    : undefined;
  const userId = hasActiveOrganization
    ? (session?.user?.id ?? undefined)
    : undefined;
  const imageUrl = hasActiveOrganization
    ? (session?.user?.image ?? undefined)
    : undefined;

  const wipSection = SHOW_WIP_SECTIONS ? null : getWipSection(pathname ?? "/");

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <DashboardSidebar
        navMain={NAV_MAIN}
        navSecondary={NAV_SECONDARY}
        hasActiveOrganization={hasActiveOrganization}
        userFullName={fullName}
        userId={userId}
        userImageUrl={imageUrl}
      />

      <SidebarInset className="min-w-0">
        <DashboardHeader
          breadcrumbs={breadcrumbs}
          currentPage={
            breadcrumbs && breadcrumbs.length > 0
              ? breadcrumbs[breadcrumbs.length - 1].label
              : undefined
          }
          hasActiveOrganization={hasActiveOrganization}
        />

        {hasActiveOrganization ? <OrganizationStatusBanner /> : null}
        <PendingCheckoutBanner />

        {/* Not a <main> — SidebarInset already renders one. */}
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          {hasActiveOrganization ? (
            wipSection ? (
              <ComingSoonSection section={wipSection} />
            ) : (
              children
            )
          ) : (
            <div className="mx-auto mt-8 flex min-h-[62vh] max-w-3xl items-center justify-center">
              <div className="relative w-full overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card/90 via-card/70 to-card/40 p-12 shadow-2xl shadow-primary/10 backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_35%)]" />
                <div className="relative flex flex-col items-center gap-4 text-center">
                  <div className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
                    Organization Access Required
                  </div>
                  <div className="text-2xl font-semibold text-foreground">
                    {isSwitchingOrg
                      ? "Switching organization..."
                      : "Please select an organization to continue"}
                  </div>
                  <div className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Choose an organization from the top-right selector to unlock
                    dashboard data, settings, members, reports, and
                    configuration.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  // Server state lives on the root QueryClient and the command palette on the
  // root CommandPaletteProvider (see RootProviders) — both survive
  // navigations; mounting either here would duplicate them per layout.
  return <DashboardLayoutInner {...props} />;
}
