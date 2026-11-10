"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { authClient } from "@/lib/auth-client";
import {
  cn,
  getFullName,
  getSelectedOrganizationId,
  isJsonObject,
  isOrganizationConfirmed,
} from "@/lib/utils";

import { NAV_SECTIONS } from "../data/nav-sections";
import { useAppShortcuts } from "../hooks/use-app-shortcuts";
import { hasActiveOrg } from "../utils/org-gate";
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
import { ProductTour } from "@/features/onboarding/components/product-tour";
import { useOnboardingCompletion } from "@/features/onboarding/hooks/use-onboarding-completion";
import {
  getWipSection,
  SHOW_WIP_SECTIONS,
  type WipSection,
} from "@/shared/config/wip-sections";

interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Persisted rail state, read from the sidebar cookie on the server. */
  defaultSidebarOpen?: boolean;
}

/*
 * The 2.7 frame: the sidebar sits on the shell colour and the work happens on
 * one raised panel, inset 8px from the window and lifted by a hairline border
 * and an xs elevation. The rail collapses to 64px (48px of rows + the inset).
 */
const SHELL_STYLE = { "--sidebar-width-icon": "3rem" } as React.CSSProperties;

const WORKSPACE = cn(
  "min-w-0 overflow-hidden bg-(--bg-main)",
  "md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-(--border-subtle) md:peer-data-[variant=inset]:shadow-(--elevation-xs)",
  // The rail's own width already includes the inset gap.
  "md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0"
);

function DashboardLayoutInner({
  children,
  defaultSidebarOpen = true,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  // The switcher's confirmed org is reactive; the cookie sampled below is not.
  const { confirmedActiveOrgId } = useOrgSwitcherContext();
  // G then a letter, J/K, / and ? (⌘K is the palette provider's).
  useAppShortcuts();
  // Keeps the server's "finished onboarding" record true, on whichever page
  // someone lands (a lost completion is re-sent; a stuck one is repaired).
  useOnboardingCompletion();
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
  const hasActiveOrganization = hasActiveOrg({
    confirmedBySession: isConfirmedBySession,
    selectedOrgId,
    // Client-only state: held back until mount so server and first client
    // render agree.
    confirmedOrgId: isMounted ? confirmedActiveOrgId : null,
    isSwitchingOrg,
  });

  const breadcrumbs = useMemo(
    () => getBreadcrumbsForPath(pathname ?? "/"),
    [pathname]
  );

  // Some accounts have no display name - fall back to first/last name the way
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
  // confirmed - the user must be able to see and use the switcher.
  const fullName =
    session?.user?.name ?? (firstLast.length > 0 ? firstLast : undefined);
  const userId = session?.user?.id ?? undefined;
  const imageUrl = session?.user?.image ?? undefined;

  const wipSection = SHOW_WIP_SECTIONS ? null : getWipSection(pathname ?? "/");

  return (
    <>
      {/* Bound the shell to the viewport so the content area (not the window)
          is the scroll container - otherwise `position: sticky` inside pages
          never engages (it would anchor to a non-scrolling ancestor). */}
      <SidebarProvider
        defaultOpen={defaultSidebarOpen}
        className="h-svh overflow-hidden"
        style={SHELL_STYLE}
      >
        <DashboardSidebar
          sections={NAV_SECTIONS}
          hasActiveOrganization={hasActiveOrganization}
          userFullName={fullName}
          userId={userId}
          userImageUrl={imageUrl}
        />

        <SidebarInset className={WORKSPACE}>
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

          {/* Not a <main> - SidebarInset already renders one. */}
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

        {/* The guided tour overlays the whole shell so it survives navigation between sections. */}
        {/* No floating assistant: ⌘K is the one door to Intelligence (2.7, 7 Nov 2026). */}
        <ProductTour />
      </SidebarProvider>
    </>
  );
}

/**
 * Gates the content region on org resolution. While the org list is still
 * loading (or an org is being auto-selected) we mirror the page layout with a
 * skeleton instead of a "pick an org" wall - that wall only appears once we've
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
  // (hasResolved/organizations come from sessionStorage). Until it flips true -
  // i.e. on the server and the first client render - both sides render the
  // skeleton, so hydration matches; the real no-org state only appears after.
  const confirmedNoOrg =
    isMounted && hasResolved && organizations.length === 0 && !isSwitchingOrg;

  return confirmedNoOrg ? <NoOrganizationState /> : <ResolvingWorkspace />;
}

/** How long the workspace may take to resolve before we say so. */
const RESOLVE_PATIENCE_MS = 10_000;

/**
 * The skeleton while the workspace resolves, bounded: nothing may sit on a
 * loading state forever. Past the deadline it says what is happening and
 * offers the two ways out, while the skeleton keeps waiting underneath.
 */
function ResolvingWorkspace() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), RESOLVE_PATIENCE_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      {slow ? (
        <div
          role="status"
          className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
        >
          <p className="text-sm text-muted-foreground">
            <b className="font-medium text-foreground">
              Your workspace is taking longer than usual to load.
            </b>{" "}
            Reloading usually fixes it.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Reload
            </button>
            <a
              href="/auth/signin"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Sign in again
            </a>
          </div>
        </div>
      ) : null}
      <ShellSkeleton />
    </>
  );
}

/**
 * Skeleton shown while the workspace resolves. Every page opens the same way
 * (title, one sentence, then its list), so this is that shape.
 */
function ShellSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl" aria-hidden="true">
      <Skeleton className="h-8 w-72 max-w-full" />
      <Skeleton className="mt-2.5 h-4 w-96 max-w-full" />
      <div className="mt-6 flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
        ))}
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
          to create one - index a contract, enrich wallets, and verify your
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
  // root CommandPaletteProvider (see RootProviders) - both survive
  // navigations; mounting either here would duplicate them per layout.
  // The org switcher wraps the shell so the shell itself can follow it.
  return (
    <OrgSwitcherProvider>
      <DashboardLayoutInner {...props} />
    </OrgSwitcherProvider>
  );
}
