import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CampaignsListsView } from "./list";

// The reference table's row menu uses @/ui/dropdown-menu. This lightweight mock
// renders the menu items inline (no portal/open state) so the row actions are
// directly assertable.
vi.mock("@/ui/dropdown-menu", async () => {
  const DropdownMenu = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  const DropdownMenuTrigger = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  const DropdownMenuContent = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  const DropdownMenuItem = ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  );

  return {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuContent,
  };
});

vi.mock("next/link", () => {
  return {
    default: ({
      href,
      children,
    }: {
      href: unknown;
      children: React.ReactNode;
    }) => <a href={String(href)}>{children}</a>,
  };
});

vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
    }),
    usePathname: () => "/campaigns",
    useSearchParams: () => new URLSearchParams(""),
  };
});

vi.mock("sonner", () => {
  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// The analytics header and the detail drawer each fetch on their own; they are
// not under test here, so stub them out to keep the list the sole focus.
vi.mock("../components/analytics-overview", () => ({
  CampaignsAnalyticsOverview: () => null,
}));

vi.mock("../components/campaign-detail-sheet", () => ({
  CampaignDetailSheet: () => null,
}));

vi.mock("../campaigns.service", () => {
  return {
    campaignsService: {
      listCampaigns: vi.fn(async () => [
        {
          id: "c_1",
          name: "Welcome",
          subject: "Hello",
          status: "sent",
          type: "email-blast",
          recipients: 100,
          createdAt: new Date(),
        },
        {
          id: "c_2",
          name: "Launch",
          subject: "Launch day",
          status: "sent",
          type: "email-blast",
          recipients: 50,
          createdAt: new Date(),
        },
        {
          id: "c_3",
          name: "Draft One",
          subject: "WIP",
          status: "draft",
          type: "email-blast",
          createdAt: new Date(),
        },
      ]),
      deleteCampaign: vi.fn(async () => undefined),
      cancelCampaign: vi.fn(async () => undefined),
    },
  };
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe("CampaignsListsView", () => {
  it("filters campaigns by status and keeps the active filter across switches", async () => {
    renderWithClient(<CampaignsListsView />);

    // All three campaigns render unfiltered, and the "All" tab starts active.
    expect(await screen.findByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Launch")).toBeInTheDocument();
    expect(screen.getByText("Draft One")).toBeInTheDocument();

    const allTab = screen.getByRole("tab", { name: /all/i });
    expect(allTab).toHaveAttribute("aria-selected", "true");

    // Filtering to "Sent" drops the draft and marks the Sent tab active.
    const sentTab = screen.getByRole("tab", { name: /sent/i });
    fireEvent.click(sentTab);
    expect(sentTab).toHaveAttribute("aria-selected", "true");
    expect(allTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Launch")).toBeInTheDocument();
    expect(screen.queryByText("Draft One")).not.toBeInTheDocument();

    // Switching to "Draft" flips the filter and the active tab persists.
    const draftTab = screen.getByRole("tab", { name: /^draft/i });
    fireEvent.click(draftTab);
    expect(draftTab).toHaveAttribute("aria-selected", "true");
    expect(sentTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Draft One")).toBeInTheDocument();
    expect(screen.queryByText("Welcome")).not.toBeInTheDocument();
    expect(screen.queryByText("Launch")).not.toBeInTheDocument();
  });

  it("opens the delete confirmation from a row's action menu", async () => {
    renderWithClient(<CampaignsListsView />);

    // Scope to the Draft One row so only its (single, non-cancellable) menu is
    // in play, then trigger Delete from the row menu.
    const row = (await screen.findByText("Draft One")).closest("tr");
    expect(row).not.toBeNull();
    const deleteItem = within(row as HTMLElement).getByRole("menuitem", {
      name: /delete/i,
    });
    fireEvent.click(deleteItem);

    expect(
      await screen.findByRole("heading", { name: /delete campaign/i })
    ).toBeInTheDocument();
  });
});
