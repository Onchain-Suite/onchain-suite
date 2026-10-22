import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SETUP_STEPS } from "../data/setup-steps";
import type { SetupStep } from "../hooks/use-setup-steps";
import { GettingStarted } from "./getting-started";

const mockUseSetupSteps = vi.fn();
vi.mock("../hooks/use-setup-steps", () => ({
  useSetupSteps: () => mockUseSetupSteps(),
  setupContractKey: (org: string | null) => ["get-started", "contract", org],
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

const steps = (doneIds: string[]): SetupStep[] =>
  SETUP_STEPS.map((s) => ({ ...s, done: doneIds.includes(s.id) }));

const show = (doneIds: string[], isLoading = false) =>
  mockUseSetupSteps.mockReturnValue({
    steps: steps(doneIds),
    isLoading,
    organizationId: "org_1",
  });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GettingStarted", () => {
  it("renders nothing while loading", () => {
    show([], true);
    const { container } = render(<GettingStarted />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once every step is done (self-removes)", () => {
    show(SETUP_STEPS.map((s) => s.id));
    const { container } = render(<GettingStarted />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count and nudge in the reference wording", () => {
    show(["domain", "contract"]);
    render(<GettingStarted />);
    expect(screen.getByText(/2\/6 steps completed/)).toBeInTheDocument();
    expect(screen.getByText(/keep it up!/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText("Done")).toHaveLength(2);
  });

  it("expands an open step to its hint and a link there", () => {
    show([]);
    render(<GettingStarted />);
    fireEvent.click(
      screen.getByRole("button", { name: /add your first contacts/i })
    );
    expect(screen.getByText(/import a csv/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /take me there/i }));
    expect(push).toHaveBeenCalledWith("/audience");
  });

  it("offers to index right from the contract step", () => {
    show([]);
    render(<GettingStarted />);
    fireEvent.click(screen.getByRole("button", { name: /index a contract/i }));
    expect(
      screen.getByRole("button", { name: /index your contract/i })
    ).toBeInTheDocument();
  });

  it("takes a done step back to where it was done", () => {
    show(["domain"]);
    render(<GettingStarted />);
    fireEvent.click(
      screen.getByRole("button", { name: /verify a sending domain/i })
    );
    expect(push).toHaveBeenCalledWith(
      "/integrations?tab=channels&channel=email"
    );
  });

  it("collapses to its header", () => {
    show([]);
    render(<GettingStarted />);
    fireEvent.click(screen.getByLabelText("Collapse getting started"));
    expect(screen.queryByText(/sync your wallets/i)).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
