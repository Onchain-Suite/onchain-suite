import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SETUP_STEPS } from "../data/setup-steps";
import type { SetupStep } from "../hooks/use-setup-steps";
import { GettingStarted } from "./getting-started";

const mockUseSetupSteps = vi.fn();
vi.mock("../hooks/use-setup-steps", () => ({
  useSetupSteps: () => mockUseSetupSteps(),
}));

const mockMode = vi.fn();
vi.mock("@/features/onboarding/hooks/use-workspace-mode", () => ({
  useWorkspaceMode: () => mockMode(),
}));

const steps = (doneIds: string[]): SetupStep[] =>
  SETUP_STEPS.map((s) => ({ ...s, done: doneIds.includes(s.id) }));

const show = (
  doneIds: string[],
  { isLoading = false, mode = "empty", modeLoading = false } = {}
) => {
  mockUseSetupSteps.mockReturnValue({
    steps: steps(doneIds),
    isLoading,
    organizationId: "org_1",
    startPath: null,
  });
  mockMode.mockReturnValue({ mode, isLoading: modeLoading });
};

afterEach(() => vi.clearAllMocks());

describe("GettingStarted", () => {
  it("renders nothing while its reads load", () => {
    show([], { isLoading: true });
    expect(render(<GettingStarted />).container).toBeEmptyDOMElement();
    show([], { modeLoading: true });
    expect(render(<GettingStarted />).container).toBeEmptyDOMElement();
  });

  it("renders nothing in a workspace already in use", () => {
    show(["domain"], { mode: "live" });
    expect(render(<GettingStarted />).container).toBeEmptyDOMElement();
  });

  it("renders nothing once every step is done", () => {
    show(SETUP_STEPS.map((s) => s.id));
    expect(render(<GettingStarted />).container).toBeEmptyDOMElement();
  });

  it("keeps count on one line and says what is next", () => {
    show(["contacts", "domain"]);
    render(<GettingStarted />);
    expect(screen.getByText("2 of 6")).toBeInTheDocument();
    expect(screen.getByText("Next: Install in-app push")).toBeInTheDocument();
  });

  it("leads back to the steps on Home", () => {
    show([]);
    render(<GettingStarted />);
    const link = screen.getByRole("link", {
      name: "Setup: 0 of 6 done. Next: Add your first contacts.",
    });
    expect(link).toHaveAttribute("href", "/dashboard#setup");
  });
});
