import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { billingService } from "../billing.service";
import { planChange } from "../utils/plan-change";
import { useCurrentPlanSize } from "./use-current-plan-size";

vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getSelectedOrganizationId: () => "org_1",
}));
vi.mock("../billing.service", () => ({
  billingService: { getPlanUsage: vi.fn(), getSubscription: vi.fn() },
}));

const usage = vi.mocked(billingService.getPlanUsage);
const subscription = vi.mocked(billingService.getSubscription);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const UNKNOWN = {
  units: null,
  hasSubscription: false,
  canResize: false,
  monthlyPrice: null,
  upgradeChargedNow: false,
};
const noSubscription = {
  hasSubscription: false,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  priceId: null,
  plan: "launch",
  planExpiresAt: null,
};

describe("useCurrentPlanSize", () => {
  beforeEach(() => {
    usage.mockReset();
    subscription.mockReset();
    usage.mockResolvedValue({
      // The server sends the plan as an object; the type calls it a name.
      plan: { key: "launch", label: "Launch", monthlyPrice: 65 } as never,
      meters: {
        contacts: { used: 20, limit: 5000, percent: 0, status: "ok" },
      },
    });
  });

  it("reports a subscriber's size and that it can be resized", async () => {
    subscription.mockResolvedValue({
      ...noSubscription,
      hasSubscription: true,
      status: "active",
      capacity: 5000,
      billedUnits: 7300,
      canResize: true,
      upgradeChargedNow: true,
    });
    const { result } = renderHook(() => useCurrentPlanSize(), { wrapper });
    await waitFor(() =>
      expect(result.current).toEqual({
        units: 7300,
        hasSubscription: true,
        canResize: true,
        // What they pay now, so the picker can say what an upgrade adds.
        monthlyPrice: 65,
        upgradeChargedNow: true,
        paidThrough: null,
        paidTimeCredited: false,
      })
    );
  });

  it("uses the plan's contact limit for a workspace billed another way", async () => {
    subscription.mockResolvedValue(noSubscription);
    const { result } = renderHook(() => useCurrentPlanSize(), { wrapper });
    await waitFor(() =>
      expect(result.current).toEqual({
        units: 5000,
        hasSubscription: false,
        canResize: false,
        monthlyPrice: 65,
        upgradeChargedNow: false,
        paidThrough: null,
        paidTimeCredited: false,
      })
    );
  });

  // What the picker needs to say a paid-up workspace owes only the difference.
  it("reports the day paid up to, and that the server credits it", async () => {
    subscription.mockResolvedValue({
      ...noSubscription,
      planExpiresAt: "2026-11-24T20:50:00.000Z",
      paidTimeCredited: true,
    });
    const { result } = renderHook(() => useCurrentPlanSize(), { wrapper });
    await waitFor(() =>
      expect(result.current).toMatchObject({
        hasSubscription: false,
        paidThrough: "2026-11-24T20:50:00.000Z",
        paidTimeCredited: true,
      })
    );
  });

  // The review finding: with the size known and the subscription not, the
  // picker took a subscriber for someone billed another way and offered a
  // bigger size as a purchase. On a server that cannot resize, that purchase
  // is a second subscription.
  it("reports no size while it does not know whether they subscribe", async () => {
    subscription.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useCurrentPlanSize(), { wrapper });
    await waitFor(() => expect(usage).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toEqual(UNKNOWN);
    expect(
      planChange({
        resolvedPlan: "launch",
        currentPlan: "launch",
        units: 12_000,
        current: result.current,
      })
    ).toBe("current");
  });

  it("reports no size when the subscription could not be read", async () => {
    subscription.mockRejectedValue(new Error("Not found"));
    const { result } = renderHook(() => useCurrentPlanSize(), { wrapper });
    await waitFor(() => expect(subscription).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toEqual(UNKNOWN);
  });

  it("offers a subscriber nothing on a server that does not say it can resize", async () => {
    // An older backend: the subscription is there, the new fields are not.
    subscription.mockResolvedValue({
      ...noSubscription,
      hasSubscription: true,
      status: "active",
    });
    const { result } = renderHook(() => useCurrentPlanSize(), { wrapper });
    await waitFor(() => expect(result.current.hasSubscription).toBe(true));
    expect(result.current.canResize).toBe(false);
    // Nor has it said it charges an upgrade at once.
    expect(result.current.upgradeChargedNow).toBe(false);
    expect(
      planChange({
        resolvedPlan: "launch",
        currentPlan: "launch",
        units: 12_000,
        current: result.current,
      })
    ).toBe("blocked");
  });
});
