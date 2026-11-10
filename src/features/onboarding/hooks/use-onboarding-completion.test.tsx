import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  hasCompleteCookie,
  isServerConfirmed,
  markCompleteOnDevice,
  readPendingCompletion,
  savePendingCompletion,
} from "../utils/completion";
import { useOnboardingCompletion } from "./use-onboarding-completion";

let user: { id: string; onboardingCompleted?: boolean } | undefined;
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: user ? { user } : null, isPending: false }),
  },
}));

let workspace = { mode: "empty", isLoading: false };
vi.mock("./use-workspace-mode", () => ({
  useWorkspaceMode: () => workspace,
}));

const getState = vi.fn();
const complete = vi.fn();
vi.mock("../completion.service", () => ({
  completionService: {
    getState: (...a: unknown[]) => getState(...a),
    complete: (...a: unknown[]) => complete(...a),
  },
}));

const mount = () => {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useOnboardingCompletion(), { wrapper });
};

beforeEach(() => {
  window.localStorage.clear();
  document.cookie = "onchain.onboardingComplete=; path=/; max-age=0";
  user = { id: "u1" };
  workspace = { mode: "empty", isLoading: false };
  vi.clearAllMocks();
  complete.mockResolvedValue(undefined);
  getState.mockResolvedValue({
    status: "in_progress",
    completionPercentage: 50,
  });
});

describe("useOnboardingCompletion", () => {
  it("reports a wizard genuinely left partway", async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.inProgress).toBe(true));
    expect(result.current.isDone).toBe(false);
    expect(result.current.completionPercentage).toBe(50);
    expect(complete).not.toHaveBeenCalled();
  });

  it("re-sends a completion the server never confirmed", async () => {
    savePendingCompletion({
      totalTimeSeconds: 240,
      currentStep: "plan_selection",
    });
    const { result } = mount();
    await waitFor(() =>
      expect(complete).toHaveBeenCalledWith({
        totalTimeSeconds: 240,
        currentStep: "plan_selection",
      })
    );
    await waitFor(() => expect(isServerConfirmed()).toBe(true));
    expect(readPendingCompletion()).toBeNull();
    expect(result.current.isDone).toBe(true);
    expect(result.current.inProgress).toBe(false);
  });

  it("keeps the pending completion when the re-send fails, and still never reminds", async () => {
    savePendingCompletion({ totalTimeSeconds: 240 });
    complete.mockRejectedValue(new Error("429"));
    const { result } = mount();
    await waitFor(() => expect(complete).toHaveBeenCalled());
    expect(readPendingCompletion()).not.toBeNull();
    expect(result.current.isDone).toBe(true);
    expect(result.current.inProgress).toBe(false);
  });

  it("repairs a record stuck in progress for someone this browser saw finish", async () => {
    markCompleteOnDevice();
    const { result } = mount();
    await waitFor(() =>
      expect(complete).toHaveBeenCalledWith({
        repaired: true,
        flowVersion: "repair",
      })
    );
    expect(result.current.inProgress).toBe(false);
    await waitFor(() => expect(isServerConfirmed()).toBe(true));
  });

  it("never reminds, and repairs, when the workspace is in use", async () => {
    workspace = { mode: "live", isLoading: false };
    const { result } = mount();
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(result.current.isDone).toBe(true);
    expect(result.current.inProgress).toBe(false);
  });

  it("does not complete the wizard for someone who never started it", async () => {
    user = { id: "member", onboardingCompleted: true };
    getState.mockResolvedValue({
      status: "not_started",
      completionPercentage: null,
    });
    const { result } = mount();
    await waitFor(() => expect(getState).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(complete).not.toHaveBeenCalled();
    expect(result.current.isDone).toBe(true);
    expect(hasCompleteCookie(document.cookie)).toBe(true);
  });

  it("remembers a completion the server holds, and stops asking", async () => {
    getState.mockResolvedValue({
      status: "completed",
      completionPercentage: 100,
    });
    const { result, unmount } = mount();
    await waitFor(() => expect(isServerConfirmed()).toBe(true));
    expect(result.current.isDone).toBe(true);
    unmount();

    getState.mockClear();
    const again = mount();
    await waitFor(() => expect(again.result.current.isChecking).toBe(false));
    expect(getState).not.toHaveBeenCalled();
    expect(again.result.current.isDone).toBe(true);
  });
});
