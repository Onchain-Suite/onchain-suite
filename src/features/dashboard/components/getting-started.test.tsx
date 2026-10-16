import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SetupStep } from "./get-started";
import { GettingStarted } from "./getting-started";

const mockUseSetupSteps = vi.fn();
vi.mock("./get-started", () => ({
  useSetupSteps: () => mockUseSetupSteps(),
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

const step = (over: Partial<SetupStep>): SetupStep => ({
  id: "contract-address",
  title: "Add your contract address",
  description: "desc",
  icon: null,
  href: "/settings?tab=account",
  cta: "Add contract",
  done: false,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GettingStarted", () => {
  it("renders nothing while loading", () => {
    mockUseSetupSteps.mockReturnValue({ steps: [], isLoading: true });
    const { container } = render(<GettingStarted />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once every step is done (self-removes)", () => {
    mockUseSetupSteps.mockReturnValue({
      steps: [step({ id: "a", done: true }), step({ id: "b", done: true })],
      isLoading: false,
    });
    const { container } = render(<GettingStarted />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count and nudge while steps remain", () => {
    mockUseSetupSteps.mockReturnValue({
      steps: [
        step({ id: "a", title: "Index a contract", done: true }),
        step({ id: "b", title: "Import your audience", done: false }),
      ],
      isLoading: false,
    });
    render(<GettingStarted />);
    expect(screen.getByText(/1\/2 done/)).toBeInTheDocument();
    expect(screen.getByText(/almost there/i)).toBeInTheDocument();
  });

  it("expands an undone step to reveal its hint and CTA link", () => {
    mockUseSetupSteps.mockReturnValue({
      steps: [
        step({
          id: "b",
          title: "Import your audience",
          hint: "Bring in your contacts.",
          href: "/audience",
          cta: "Open audience",
          done: false,
        }),
      ],
      isLoading: false,
    });
    render(<GettingStarted />);
    fireEvent.click(
      screen.getByRole("button", { name: /import your audience/i })
    );
    expect(screen.getByText("Bring in your contacts.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open audience/i })
    ).toHaveAttribute("href", "/audience");
  });
});
