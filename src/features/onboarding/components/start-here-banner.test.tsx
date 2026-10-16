import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FIRST_MILE_SECTOR_KEY } from "../utils/onboarding-timing";
import { StartHereBanner } from "./start-here-banner";

const mockMode = vi.fn();
vi.mock("../hooks/use-workspace-mode", () => ({
  useWorkspaceMode: () => mockMode(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

beforeEach(() => {
  localStorage.clear();
  mockMode.mockReturnValue({ mode: "empty", isLoading: false, signals: {} });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("StartHereBanner", () => {
  it("renders nothing while workspace mode is loading", () => {
    mockMode.mockReturnValue({ mode: "live", isLoading: true, signals: {} });
    const { container } = render(<StartHereBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a live workspace", () => {
    mockMode.mockReturnValue({ mode: "live", isLoading: false, signals: {} });
    const { container } = render(<StartHereBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers the optional index nudge for a web3/unknown sector", () => {
    render(<StartHereBanner />);
    expect(screen.getByText(/index your contract/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /index a contract/i })
    ).toBeInTheDocument();
    // Importing is offered as an equal path, so indexing reads as optional.
    expect(
      screen.getByRole("link", { name: /import an audience instead/i })
    ).toBeInTheDocument();
  });

  it("skips the contract nudge for a web2 sector and points at import", () => {
    localStorage.setItem(FIRST_MILE_SECTOR_KEY, "SaaS or Software");
    render(<StartHereBanner />);
    expect(
      screen.getByText("Start here: import your audience")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /import your audience/i })
    ).toHaveAttribute("href", "/audience/import-export");
    expect(screen.queryByText(/index your contract/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /index a contract/i })
    ).not.toBeInTheDocument();
  });

  it("can be dismissed and stays dismissed", () => {
    const { container, rerender } = render(<StartHereBanner />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem("onchain.onboarding.startHereDismissed")).toBe(
      "1"
    );
    rerender(<StartHereBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
