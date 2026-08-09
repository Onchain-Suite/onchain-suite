import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api-client";

import { billingService } from "./billing.service";

type ApiClientResponse = Awaited<ReturnType<typeof apiClient.request>>;

const mockAxiosError = (status: number, data?: unknown) => {
  const err = new Error("AxiosError") as Error & {
    response?: { status: number; data?: unknown };
  };
  err.response = { status, data };
  return err;
};

describe("billingService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adds x-org-id header when orgId is provided", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      status: 200,
      data: { data: { ok: true } },
    } as unknown as ApiClientResponse);

    const res = await billingService.getOverview({ orgId: "org-123" });

    expect(res).toEqual({ ok: true });
    expect(requestSpy).toHaveBeenCalledTimes(1);
    const cfg = requestSpy.mock.calls[0]?.[0] as unknown as {
      headers: Record<string, string>;
    };
    expect(cfg.headers["x-org-id"]).toBe("org-123");
  });

  it("retries on 500 and succeeds", async () => {
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockRejectedValueOnce(mockAxiosError(500, { message: "boom" }))
      .mockResolvedValueOnce({
        status: 200,
        data: { data: { ok: true } },
      } as unknown as ApiClientResponse);

    const res = await billingService.getPlan({ orgId: "org-123" });

    expect(res).toEqual({ ok: true });
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it("returns friendly error message on 401", async () => {
    vi.spyOn(apiClient, "request").mockRejectedValueOnce(
      mockAxiosError(401, { error: { message: "Authentication failed" } })
    );

    await expect(
      billingService.listInvoices(undefined, { orgId: "org-123" })
    ).rejects.toThrow("You’re not authenticated");
  });

  it("hits the correct endpoint for invoice download", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      status: 200,
      data: { data: { url: "https://example.com/invoice.pdf" } },
    } as unknown as ApiClientResponse);

    const res = await billingService.getInvoiceDownloadUrl("inv_1", {
      orgId: "org-123",
    });

    expect(res).toEqual({ url: "https://example.com/invoice.pdf" });
    const cfg = requestSpy.mock.calls[0]?.[0] as unknown as {
      method?: string;
      url?: string;
    };
    expect(cfg.method).toBe("GET");
    expect(cfg.url).toBe("/billing/invoices/inv_1/download");
  });

  it("adds a payment method via POST /billing/payment-methods", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      status: 201,
      data: {
        data: { id: "pm_1", type: "card", last4: "4242", isDefault: true },
      },
    } as unknown as ApiClientResponse);

    const res = await billingService.addPaymentMethod(
      { type: "card", brand: "Visa", last4: "4242", isDefault: true },
      { orgId: "org-123" }
    );

    expect((res as unknown as { id?: string }).id).toBe("pm_1");
    const cfg = requestSpy.mock.calls[0]?.[0] as unknown as {
      method?: string;
      url?: string;
      headers: Record<string, string>;
    };
    expect(cfg.method).toBe("POST");
    expect(cfg.url).toBe("/billing/payment-methods");
    expect(cfg.headers["x-org-id"]).toBe("org-123");
    expect(cfg.headers["x-onchain-silent-error"]).toBe("1");
  });

  it("sets default payment method via PUT /billing/payment-methods/default", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      status: 200,
      data: { data: { success: true } },
    } as unknown as ApiClientResponse);

    const res = await billingService.setDefaultPaymentMethod(
      { id: "pm_1" },
      { orgId: "org-123" }
    );

    expect((res as unknown as { success?: boolean }).success).toBe(true);
    const cfg = requestSpy.mock.calls[0]?.[0] as unknown as {
      method?: string;
      url?: string;
    };
    expect(cfg.method).toBe("PUT");
    expect(cfg.url).toBe("/billing/payment-methods/default");
  });

  it("defaults a direct plan checkout to card, so no caller can fall through to the backend's crypto default", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          mode: "stripe_checkout",
          paymentUrl: "https://checkout.stripe.com/c/pay/cs_test_2",
          reference: "ref-plan",
        },
      },
    } as unknown as ApiClientResponse);

    // Deliberately bypasses startPlanCheckout and omits paymentMethod.
    await billingService.checkoutPlan(
      { plan: "growth", organizationId: "org-123" },
      { orgId: "org-123" }
    );

    const cfg = requestSpy.mock.calls[0]?.[0] as unknown as {
      url?: string;
      data?: Record<string, unknown>;
    };
    expect(cfg.url).toBe("/billing/checkout/plan");
    expect(cfg.data?.paymentMethod).toBe("card");
  });

  it("does not override an explicit crypto plan checkout", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      status: 200,
      data: { data: { mode: "static_link", paymentUrl: "https://pay/y" } },
    } as unknown as ApiClientResponse);

    await billingService.checkoutPlan(
      { plan: "growth", organizationId: "org-123", paymentMethod: "crypto" },
      { orgId: "org-123" }
    );

    const cfg = requestSpy.mock.calls[0]?.[0] as unknown as {
      data?: Record<string, unknown>;
    };
    expect(cfg.data?.paymentMethod).toBe("crypto");
  });

  it("defaults PAYG credit top-ups to the card (Stripe) checkout", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          mode: "stripe_checkout",
          paymentUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
          reference: "ref-topup",
        },
      },
    } as unknown as ApiClientResponse);

    await billingService.checkoutCredits(
      { organizationId: "org-123", amountUsd: 25 },
      { orgId: "org-123" }
    );

    const cfg = requestSpy.mock.calls[0]?.[0] as unknown as {
      url?: string;
      data?: Record<string, unknown>;
    };
    expect(cfg.url).toBe("/billing/checkout/credits");
    expect(cfg.data?.paymentMethod).toBe("card");
  });

  it("still allows an explicit crypto top-up", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      status: 200,
      data: { data: { mode: "static_link", paymentUrl: "https://pay/x" } },
    } as unknown as ApiClientResponse);

    await billingService.checkoutCredits(
      { organizationId: "org-123", amountUsd: 25, paymentMethod: "crypto" },
      { orgId: "org-123" }
    );

    const cfg = requestSpy.mock.calls[0]?.[0] as unknown as {
      data?: Record<string, unknown>;
    };
    expect(cfg.data?.paymentMethod).toBe("crypto");
  });

  it("polls checkout status on the provider-agnostic upgrade endpoint", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      status: 200,
      data: { data: { status: "success" } },
    } as unknown as ApiClientResponse);

    await billingService.getCheckoutStatus("ref-abc", { orgId: "org-123" });

    const cfg = requestSpy.mock.calls[0]?.[0] as unknown as {
      method?: string;
      url?: string;
    };
    expect(cfg.method).toBe("GET");
    expect(cfg.url).toBe("/billing/upgrade/blockradar/ref-abc");
  });

  it("surfaces the backend error code from error.details, not just the message", async () => {
    // Shape emitted by AllExceptionsFilter: the status-derived code sits at
    // error.code, while the exception's own payload is preserved in details.
    vi.spyOn(apiClient, "request").mockRejectedValueOnce(
      mockAxiosError(400, {
        error: {
          code: "BAD_REQUEST",
          message: "Card checkout is not configured",
          details: {
            code: "FIAT_CHECKOUT_UNAVAILABLE",
            message: "Card checkout is not configured",
          },
        },
      })
    );

    await expect(
      billingService.checkoutPlan(
        { plan: "growth", organizationId: "org-123", paymentMethod: "card" },
        { orgId: "org-123" }
      )
    ).rejects.toMatchObject({ code: "FIAT_CHECKOUT_UNAVAILABLE" });
  });
});
