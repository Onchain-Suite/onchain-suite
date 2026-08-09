import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CampaignsListsView } from "./list";

vi.mock("@/ui/dropdown-menu", async () => {
  const ReactImport = await import("react");
  const ReactNs = ReactImport.default ?? ReactImport;

  type InjectedRadioGroupProps = {
    __groupValue?: string;
    __onGroupValueChange?: (value: string) => void;
  };

  const DropdownMenu = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );

  const DropdownMenuTrigger = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );

  const DropdownMenuContent = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );

  const DropdownMenuRadioGroup = ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <div>
      {ReactNs.Children.map(children, (child) => {
        if (!ReactNs.isValidElement(child)) return child;
        return ReactNs.cloneElement(
          child as React.ReactElement<InjectedRadioGroupProps>,
          {
            __groupValue: value,
            __onGroupValueChange: onValueChange,
          }
        );
      })}
    </div>
  );

  const DropdownMenuRadioItem = ({
    value,
    children,
    __groupValue,
    __onGroupValueChange,
  }: {
    value: string;
    children: React.ReactNode;
  } & InjectedRadioGroupProps) => (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={__groupValue === value}
      onClick={() => __onGroupValueChange?.(value)}
    >
      {children}
    </button>
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
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
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

vi.mock("next/image", () => {
  return {
    default: ({ src, alt }: { src: unknown; alt: unknown }) => (
      <div
        data-testid="next-image"
        data-src={String(src)}
        data-alt={String(alt)}
      />
    ),
  };
});

vi.mock("sonner", () => {
  return {
    toast: {
      error: vi.fn(),
    },
  };
});

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
          createdAt: new Date(),
        },
      ]),
      getCalendar: vi.fn(async () => [
        {
          id: "c_1",
          name: "Welcome",
          status: "sent",
          scheduledFor: new Date().toISOString(),
        },
      ]),
      createCampaign: vi.fn(async () => ({
        id: "created_1",
      })),
      setTemplate: vi.fn(async () => undefined),
    },
  };
});

vi.mock("@/features/templates/templates.service", () => {
  return {
    templatesService: {
      list: vi.fn(async () => [
        {
          id: "t_1",
          name: "Template A",
          previewUrl: "/placeholder.svg",
          updatedAt: new Date().toISOString(),
        },
      ]),
    },
  };
});

vi.mock("../../campaigns/components/table", () => {
  return {
    CampaignsTable: ({ data }: { data: unknown[] }) => (
      <div data-testid="campaigns-table">rows:{data.length}</div>
    ),
  };
});

vi.mock("../../campaigns/components/calendar", () => {
  return {
    CampaignsCalendar: ({ campaigns }: { campaigns: unknown[] }) => (
      <div data-testid="campaigns-calendar">events:{campaigns.length}</div>
    ),
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
  it("switches between list, calendar, and library without losing filters", async () => {
    renderWithClient(<CampaignsListsView />);

    expect(await screen.findByTestId("campaigns-table")).toHaveTextContent(
      "rows:1"
    );

    const statusTrigger = screen.getByRole("button", { name: /status:/i });
    expect(statusTrigger).toHaveTextContent(/status:\s*all status/i);

    fireEvent.click(statusTrigger);
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "Sent" }));
    expect(
      await screen.findByRole("button", { name: /status: sent/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Calendar" }));
    expect(await screen.findByTestId("campaigns-calendar")).toHaveTextContent(
      "events:1"
    );
    expect(
      screen.getByRole("button", { name: /status: sent/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /view library/i }));
    expect(await screen.findByText("Template A")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "List" }));
    expect(await screen.findByTestId("campaigns-table")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /status: sent/i })
    ).toBeInTheDocument();
  });
});
