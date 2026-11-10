import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingResumeBanner } from "./onboarding-resume-banner";

let completion = {
  inProgress: true,
  isDone: false,
  isChecking: false,
  completionPercentage: 50 as number | null,
};
vi.mock("@/features/onboarding/hooks/use-onboarding-completion", () => ({
  useOnboardingCompletion: () => completion,
}));

let role: string | null = "OWNER";
vi.mock("@/shared/hooks/client/use-my-org-role", () => ({
  useMyOrgRole: () => ({ role }),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  completion = {
    inProgress: true,
    isDone: false,
    isChecking: false,
    completionPercentage: 50,
  };
  role = "OWNER";
  vi.clearAllMocks();
});

describe("OnboardingResumeBanner", () => {
  it("offers an owner who left the wizard a way back, without redirecting", () => {
    render(<OnboardingResumeBanner />);
    expect(screen.getByText("You left setup partway.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue setup" })
    ).toHaveAttribute("href", "/onboarding");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows nothing to someone who finished onboarding", () => {
    completion = { ...completion, inProgress: false, isDone: true };
    expect(render(<OnboardingResumeBanner />).container).toBeEmptyDOMElement();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows nothing to members, or while the role is unknown", () => {
    role = "ADMIN";
    expect(render(<OnboardingResumeBanner />).container).toBeEmptyDOMElement();
    role = null;
    expect(render(<OnboardingResumeBanner />).container).toBeEmptyDOMElement();
  });
});
