import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTaskCompletion } from "./get-started";

/**
 * The bug: `isLoading` fanned seven independent queries into one boolean, so a
 * single request that never settled pinned the dashboard on its skeleton. React
 * Query has no request timeout, and the shared axios client allows 30s with
 * `retry: 1` behind it — up to a minute of skeleton while the other six had
 * long since answered. Users refreshed to escape it, which "worked" only
 * because it abandoned the stalled request.
 *
 * The checklist is advisory, so anything unconfirmed reads as not-done.
 */
vi.mock("@/features/settings/project-settings.service", () => ({
  projectSettingsService: {
    getProjectSettings: vi.fn(() => new Promise(() => {})),
  },
}));
vi.mock("@/features/settings/sender-identities.service", () => ({
  senderIdentitiesService: {
    listSenderIdentities: vi.fn(() => new Promise(() => {})),
  },
}));
vi.mock("@/features/audience/audience.service", () => ({
  audienceService: { getOverview: vi.fn(() => new Promise(() => {})) },
}));
vi.mock("@/features/campaigns/campaigns.service", () => ({
  campaignsService: { listCampaigns: vi.fn(() => new Promise(() => {})) },
}));
vi.mock("@/features/automation/automation.service", () => ({
  automationService: { listAutomations: vi.fn(() => new Promise(() => {})) },
}));
vi.mock("@/features/intelligence/intelligence.service", () => ({
  intelligenceService: { getQueryHistory: vi.fn(() => new Promise(() => {})) },
}));
vi.mock("@/features/settings/domain.service", () => ({
  domainService: { listDomains: vi.fn(() => new Promise(() => {})) },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useTaskCompletion deadline", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("stops showing the skeleton even when every query hangs forever", async () => {
    // Every service above returns a promise that never settles — the worst
    // case, and the one the old `some(isPending)` gate could not escape.
    const { result } = renderHook(() => useTaskCompletion("org_1"), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(4100);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("reports unconfirmed tasks as incomplete rather than blocking", async () => {
    const { result } = renderHook(() => useTaskCompletion("org_1"), {
      wrapper,
    });
    await act(async () => {
      vi.advanceTimersByTime(4100);
    });
    // `data === true` is the completion test, so an unresolved query already
    // reads as not-done. Releasing the skeleton cannot mark anything complete.
    await waitFor(() =>
      expect(
        Object.values(result.current.completionById).every((v) => v === false)
      ).toBe(true)
    );
  });

  it("does not gate at all without an organization", () => {
    // Queries are disabled, so there is nothing to wait for.
    const { result } = renderHook(() => useTaskCompletion(null), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});
