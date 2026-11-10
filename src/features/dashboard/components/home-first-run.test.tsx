import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setupStepsFor } from "../data/setup-steps";
import { HomeFirstRun } from "./home-first-run";
import type { StartPath } from "@/features/onboarding/utils/start-path";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/features/onboarding/hooks/use-tour", () => ({ startTour: vi.fn() }));

let startPath: StartPath | null = null;
vi.mock("../hooks/use-setup-steps", () => ({
  setupContractKey: () => ["k"],
  useSetupSteps: () => ({
    steps: setupStepsFor(startPath).map((s) => ({ ...s, done: false })),
    isLoading: false,
    organizationId: "org_1",
    startPath,
  }),
}));

const saveStartPath = vi.fn();
vi.mock("@/features/onboarding/utils/start-path", () => ({
  saveStartPath: (...args: unknown[]) => saveStartPath(...args),
}));

let orgName: string | undefined = "Datum Labs";
vi.mock("@/features/common/layout/components/org-switcher-context", () => ({
  useOrgSwitcherContextOptional: () => ({
    activeOrg: orgName ? { id: "org_1", name: orgName } : undefined,
  }),
}));

const show = () => render(<HomeFirstRun greeting="morning" name="Joshua" />);

beforeEach(() => {
  startPath = null;
  orgName = "Datum Labs";
  vi.clearAllMocks();
});

describe("HomeFirstRun", () => {
  it("names the real workspace, never a placeholder project", () => {
    show();
    expect(screen.getByText("Datum Labs")).toBeInTheDocument();
    expect(screen.queryByText(/YieldFarm/)).not.toBeInTheDocument();
  });

  it("says 'your workspace' until the workspace's name has loaded", () => {
    orgName = undefined;
    show();
    expect(screen.getByText("your workspace")).toBeInTheDocument();
  });

  it("opens on the question and saves the answer for this workspace", () => {
    show();
    expect(
      screen.getByRole("heading", { name: "What do you have today?" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /a smart contract/i }));
    expect(saveStartPath).toHaveBeenCalledWith("org_1", "chain");
  });

  it("shows the steps once answered, first win first, and can ask again", () => {
    startPath = "site";
    show();
    expect(screen.getByText(/0 of 6 set up/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Publish a sign-up form" })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Build a sign-up form" })
    );
    expect(push).toHaveBeenCalledWith("/forms?new=1");
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(saveStartPath).toHaveBeenCalledWith("org_1", null);
  });
});
