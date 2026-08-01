"use client";

import {
  BoltIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  DocumentTextIcon,
  MegaphoneIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import type { NavItem } from "@/components/layout/nav-utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

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
import {
  OrgSwitcherProvider,
  useOrgSwitcherContext,
} from "./org-switcher-context";
import { OrganizationStatusBanner } from "./organization-status-banner";
import { PendingCheckoutBanner } from "@/features/billing/components/pending-checkout-banner";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import {
  getWipSection,
  isWipHref,
  SHOW_WIP_SECTIONS,
  type WipSection,
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
// Matches the reference shell: Analytics is a top-level entry and Settings sits
// inline at the foot of the list (no separate utility group).
const NAV_MAIN: NavItem[] = withWipFlags([
  { title: "Dashboard", url: PRIVATE_ROUTES.DASHBOARD, icon: Squares2X2Icon },
  { title: "Campaigns", url: PRIVATE_ROUTES.CAMPAIGNS, icon: MegaphoneIcon },
  { title: "Audience", url: PRIVATE_ROUTES.AUDIENCE, icon: UserGroupIcon },
  { title: "Forms", url: PRIVATE_ROUTES.FORMS, icon: DocumentTextIcon },
  { title: "Automations", url: PRIVATE_ROUTES.AUTOMATIONS, icon: BoltIcon },
  {
    title: "Intelligence",
    url: PRIVATE_ROUTES.INTELLIGENCE,
    icon: CpuChipIcon,
  },
  { title: "Analytics", url: PRIVATE_ROUTES.ANALYTICS, icon: ChartBarIcon },
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
  // Identity is session-derived and independent of org selection, so the
  // account block (and its org switcher) stays visible even before an org is
  // confirmed — the user must be able to see and use the switcher.
  const fullName =
    session?.user?.name ?? (firstLast.length > 0 ? firstLast : undefined);
  const userId = session?.user?.id ?? undefined;
  const imageUrl = session?.user?.image ?? undefined;

  const wipSection = SHOW_WIP_SECTIONS ? null : getWipSection(pathname ?? "/");

  return (
    <OrgSwitcherProvider>
      <SidebarProvider defaultOpen={defaultSidebarOpen}>
        <DashboardSidebar
          navMain={NAV_MAIN}
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
            <ShellContent
              hasActiveOrganization={hasActiveOrganization}
              isSwitchingOrg={isSwitchingOrg}
              wipSection={wipSection}
            >
              {children}
            </ShellContent>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </OrgSwitcherProvider>
  );
}

/**
 * Gates the content region on org resolution. While the org list is still
 * loading (or an org is being auto-selected) we mirror the page layout with a
 * skeleton instead of a "pick an org" wall — that wall only appears once we've
 * confirmed the account genuinely has no organization.
 */
function ShellContent({
  hasActiveOrganization,
  isSwitchingOrg,
  wipSection,
  children,
}: {
  hasActiveOrganization: boolean;
  isSwitchingOrg: boolean;
  wipSection: WipSection | null;
  children: React.ReactNode;
}) {
  const { hasResolved, organizations, isMounted } = useOrgSwitcherContext();

  if (hasActiveOrganization) {
    return wipSection ? <ComingSoonSection section={wipSection} /> : children;
  }

  // `isMounted` guards the branch that reads client-only storage
  // (hasResolved/organizations come from sessionStorage). Until it flips true —
  // i.e. on the server and the first client render — both sides render the
  // skeleton, so hydration matches; the real no-org state only appears after.
  const confirmedNoOrg =
    isMounted && hasResolved && organizations.length === 0 && !isSwitchingOrg;

  return confirmedNoOrg ? <NoOrganizationState /> : <ShellSkeleton />;
}

/** Layout-mirroring skeleton shown while the workspace resolves. */
function ShellSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6" aria-hidden="true">
      <div className="rounded-2xl border border-border bg-card px-6 py-7">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-border bg-card p-5"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

/** Shown only once we've confirmed the signed-in account has no organization. */
function NoOrganizationState() {
  return (
    <div className="mx-auto mt-8 flex min-h-[62vh] max-w-2xl items-center justify-center">
      <div className="w-full rounded-2xl border border-border bg-card p-10 text-center">
        <div className="mx-auto inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
          Set up your workspace
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-foreground">
          Let&apos;s get your workspace ready
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          You&apos;re signed in but don&apos;t have a workspace yet. Run setup
          to create one — index a contract, enrich wallets, and verify your
          sending domain. Already invited to one? It appears in the account menu
          at the bottom of the sidebar.
        </p>
        <div className="mt-6">
          <a
            href="/onboarding?reason=missing_org"
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start setup
          </a>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  // Server state lives on the root QueryClient and the command palette on the
  // root CommandPaletteProvider (see RootProviders) — both survive
  // navigations; mounting either here would duplicate them per layout.
  return <DashboardLayoutInner {...props} />;
}
