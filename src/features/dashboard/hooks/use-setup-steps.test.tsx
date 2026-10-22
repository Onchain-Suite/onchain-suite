import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SETUP_DEADLINE_MS, useSetupCompletion } from "./use-setup-steps";

/*
 * Six independent reads fan into one `isLoading`, so one request that never
 * settles must not hold the panel: past the deadline, anything unconfirmed
 * reads as not done (the checklist is advisory).
 */
const { never } = vi.hoisted(() => ({
  never: () => new Promise(() => {}),
}));
vi.mock("@/features/audience/audience.service", () => ({
  audienceService: { getOverview: vi.fn(never), getSyncStatus: vi.fn(never) },
}));
vi.mock("@/features/settings/sender-identities.service", () => ({
  senderIdentitiesService: {
    listDomains: vi.fn(never),
    getDomainAuthentication: vi.fn(never),
  },
}));
vi.mock("@/features/settings/inapp.service", () => ({
  inAppService: { getStatus: vi.fn(never) },
}));
vi.mock("@/features/settings/push-credentials.service", () => ({
  pushCredentialsService: { list: vi.fn(never) },
}));
vi.mock("@/features/settings/project-settings.service", () => ({
  projectSettingsService: { getProjectSettings: vi.fn(never) },
}));
vi.mock("@/features/analytics/dashboards.service", () => ({
  dashboardsApi: { allLinks: vi.fn(never) },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useSetupCompletion deadline", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("stops loading even when every read hangs, with nothing marked done", async () => {
    const { result } = renderHook(() => useSetupCompletion("org_1"), {
      wrapper,
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(SETUP_DEADLINE_MS + 100);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Object.values(result.current.completion).every((v) => !v)).toBe(
      true
    );
  });

  it("does not wait at all without an organization", () => {
    const { result } = renderHook(() => useSetupCompletion(null), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});
