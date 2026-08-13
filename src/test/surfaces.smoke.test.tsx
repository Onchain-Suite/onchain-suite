/**
 * Rugged smoke suite: every main dashboard surface and every Settings tab must
 * mount and render its real component tree without throwing. We render each
 * surface's REAL top-level feature component (never a stub of the component
 * under test) inside a QueryClientProvider and assert a stable heading paints.
 *
 * All `vi.mock` calls are hoisted, so the file-top mocks below apply to every
 * test. They give each surface a safe, empty world:
 *   - next/navigation: inert router + empty search params
 *   - @/lib/api-client: every method resolves an empty `{ success, data: {} }`
 *     envelope, so every typed service returns empty data instead of throwing
 *   - @/lib/utils: real module except getSelectedOrganizationId, forced to a
 *     stable org so org-gated pages proceed past their "no org" bail
 *   - next/image, next/link, sonner: light presentational stubs
 *
 * Two heavy leaves are stubbed (documented at their mock) because they open
 * real transports jsdom cannot service:
 *   - socket.io-client (Inbox realtime socket)
 * The Settings owner-role hook is mocked so every tab is reachable.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as LibUtils from "@/lib/utils";

import { AnalyticsPage } from "@/features/analytics/analytics-page";
import { AudiencePages } from "@/features/audience/pages";
import { AutomationsPage } from "@/features/automation/pages";
import { CampaignsListsView } from "@/features/campaigns/pages";
import { MainDashboard } from "@/features/dashboard/page";
import { FormsPage } from "@/features/forms/pages";
import { InboxPages } from "@/features/inbox/pages";
import IntelligencePage from "@/features/intelligence/components/intelligence.page";
import SettingsPage from "@/features/settings/pages/page";
// --- Real feature components under test ------------------------------------
import { CommandPaletteProvider } from "@/shared/components/common/command-palette";
// --- Settings tabs ---------------------------------------------------------
// Settings hides owner-only tabs (Billing) when the role hook says the caller
// is not an OWNER. Force OWNER so every tab is reachable and clickable.
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

// --- next/navigation: inert router, empty params ---------------------------
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// --- @/lib/api-client: safe empty envelope for every call ------------------
vi.mock("@/lib/api-client", () => {
  const emptyEnvelope = { data: { success: true, data: {} } };
  const resolve = vi.fn(async () => emptyEnvelope);
  return {
    apiClient: {
      request: resolve,
      get: resolve,
      post: resolve,
      put: resolve,
      patch: resolve,
      delete: resolve,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
    API_BASE_URL: "/api/v1",
  };
});

// --- @/lib/utils: real module, only force a selected org -------------------
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof LibUtils>();
  return {
    ...actual,
    getSelectedOrganizationId: () => "org_test",
  };
});

// --- Presentational third-party stubs --------------------------------------
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: unknown; alt: unknown }) => (
    <div
      data-testid="next-image"
      data-src={String(src)}
      data-alt={String(alt)}
    />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: unknown;
    children: React.ReactNode;
  }) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));

// --- Heavy leaf: Inbox opens a real socket.io transport on mount -----------
// Stubbing the client keeps the Inbox page component itself real while giving
// its realtime effect a no-op socket instead of a live connection jsdom can't
// service.
vi.mock("socket.io-client", () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    close: vi.fn(),
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

const HEADING_TIMEOUT = { timeout: 5000 } as const;

const dashboardUser = {
  projectName: "Test Project",
  userType: "DeFi" as const,
  isNewUser: false,
  subscriptionTier: "full_paid" as const,
  fullName: "Test User",
};

describe("dashboard surfaces smoke", () => {
  it("MainDashboard mounts", async () => {
    // The dashboard's CommandBar reads CommandPaletteContext, which the real
    // dashboard route provides higher in the tree; supply it here so the page
    // mounts with its real command bar rather than a stub.
    renderWithClient(
      <CommandPaletteProvider>
        <MainDashboard userData={dashboardUser} />
      </CommandPaletteProvider>
    );
    expect(
      await screen.findByText(
        /good (morning|afternoon|evening)/i,
        undefined,
        HEADING_TIMEOUT
      )
    ).toBeInTheDocument();
  });

  it("CampaignsListsView mounts", async () => {
    renderWithClient(<CampaignsListsView />);
    expect(
      await screen.findByRole(
        "heading",
        { name: /campaigns/i },
        HEADING_TIMEOUT
      )
    ).toBeInTheDocument();
  });

  it("AudiencePages mounts", async () => {
    renderWithClient(<AudiencePages />);
    expect(
      await screen.findByRole("heading", { name: /audience/i }, HEADING_TIMEOUT)
    ).toBeInTheDocument();
  });

  it("FormsPage mounts", async () => {
    renderWithClient(<FormsPage />);
    expect(
      await screen.findByRole("heading", { name: /forms/i }, HEADING_TIMEOUT)
    ).toBeInTheDocument();
  });

  it("AutomationsPage mounts", async () => {
    renderWithClient(<AutomationsPage />);
    expect(
      await screen.findByRole(
        "heading",
        { name: /automations/i },
        HEADING_TIMEOUT
      )
    ).toBeInTheDocument();
  });

  it("IntelligencePage mounts", async () => {
    renderWithClient(<IntelligencePage />);
    expect(
      await screen.findByRole(
        "heading",
        { name: /intelligence/i },
        HEADING_TIMEOUT
      )
    ).toBeInTheDocument();
  });

  it("AnalyticsPage mounts", async () => {
    renderWithClient(<AnalyticsPage />);
    expect(
      await screen.findByRole(
        "heading",
        { name: /analytics/i },
        HEADING_TIMEOUT
      )
    ).toBeInTheDocument();
  });

  it("InboxPages mounts", async () => {
    renderWithClient(<InboxPages />);
    expect(
      await screen.findByRole("heading", { name: /inbox/i }, HEADING_TIMEOUT)
    ).toBeInTheDocument();
  });

  it("SettingsPage mounts", async () => {
    renderWithClient(<SettingsPage />);
    expect(
      await screen.findByRole("heading", { name: /settings/i }, HEADING_TIMEOUT)
    ).toBeInTheDocument();
  });
});

vi.mock("@/shared/hooks/client/use-my-org-role", () => ({
  useMyOrgRole: vi.fn(() => ({ role: "OWNER", loading: false })),
}));

describe("settings tabs smoke", () => {
  beforeEach(() => {
    vi.mocked(useMyOrgRole).mockReturnValue({ role: "OWNER", loading: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Each entry: nav button label -> a stable string that only appears inside
  // that tab's own content (never a nav label), so a passing assertion proves
  // the tab's real component subtree mounted, not just that the nav re-rendered.
  const tabCases: Array<{ nav: RegExp; content: RegExp }> = [
    { nav: /^profile$/i, content: /profile details/i },
    { nav: /^account$/i, content: /token ticker/i },
    { nav: /privacy/i, content: /zero-knowledge identity/i },
    { nav: /^billing$/i, content: /plan & usage/i },
    { nav: /integrations/i, content: /in-app push/i },
    { nav: /rewards/i, content: /launch waitlist/i },
  ];

  it("renders every Settings tab's content region", async () => {
    renderWithClient(<SettingsPage />);

    // The Profile tab is active on first paint.
    const nav = await screen.findByRole(
      "navigation",
      { name: /settings sections/i },
      HEADING_TIMEOUT
    );

    for (const { nav: navLabel, content } of tabCases) {
      const button = within(nav).getByRole("button", { name: navLabel });
      fireEvent.click(button);
      // The clicked tab must become current and its content must mount.
      expect(button).toHaveAttribute("aria-current", "page");
      expect(
        await screen.findAllByText(content, undefined, HEADING_TIMEOUT)
      ).not.toHaveLength(0);
    }
  });
});
