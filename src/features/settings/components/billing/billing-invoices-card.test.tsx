import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BillingInvoicesCard } from "./billing-invoices-card";

const service = vi.hoisted(() => ({
  getBillingInvoices: vi.fn(),
  getInvoiceDownloadUrl: vi.fn(),
}));
vi.mock("@/features/billing/billing.service", () => ({
  billingService: service,
}));

const VIEW = "https://invoice.stripe.com/i/acct_1/live_abc";
const PDF = "https://pay.stripe.com/invoice/acct_1/live_abc/pdf";
const SCRIPT_URL = ["javascript", "alert(1)"].join(":");

function renderCard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BillingInvoicesCard />
    </QueryClientProvider>
  );
}

describe("BillingInvoicesCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // A subscriber's invoices are Stripe's. Each links to Stripe's page and PDF,
  // and offers no receipt of ours: there is none, and asking for one is a 404.
  it("links a subscription invoice to Stripe's page and PDF", async () => {
    service.getBillingInvoices.mockResolvedValue({
      items: [
        {
          id: "stripe:in_1",
          number: "ONCH-0002",
          description: "Plan change",
          amountUsd: 26.27,
          status: "paid",
          paidAt: "2026-11-12T12:00:00.000Z",
          payUrl: null,
          canDownload: false,
          viewUrl: VIEW,
          pdfUrl: PDF,
        },
      ],
    });
    renderCard();
    expect(await screen.findByText("ONCH-0002")).toBeTruthy();
    expect(screen.getByText("Plan change")).toBeTruthy();
    expect(screen.getByText("$26.27")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "View" }).getAttribute("href")
    ).toBe(VIEW);
    expect(screen.getByRole("link", { name: "PDF" }).getAttribute("href")).toBe(
      PDF
    );
    expect(screen.queryByRole("button", { name: /Receipt/ })).toBeNull();
  });

  it("still offers our own receipt on a paid invoice of ours", async () => {
    service.getBillingInvoices.mockResolvedValue([
      {
        id: "inv_1",
        number: "INV-0001",
        description: "Launch renewal",
        amountUsd: 39,
        status: "paid",
        paidAt: "2026-11-01T12:00:00.000Z",
        canDownload: true,
      },
    ]);
    renderCard();
    expect(await screen.findByRole("button", { name: /Receipt/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "View" })).toBeNull();
  });

  it("offers an unpaid subscription invoice its Pay page", async () => {
    service.getBillingInvoices.mockResolvedValue([
      {
        id: "stripe:in_2",
        number: "ONCH-0003",
        description: "Plan change",
        amountUsd: 26.27,
        status: "open",
        payUrl: VIEW,
        canDownload: false,
        viewUrl: VIEW,
        pdfUrl: PDF,
      },
    ]);
    renderCard();
    expect(
      (await screen.findByRole("link", { name: "Pay" })).getAttribute("href")
    ).toBe(VIEW);
  });

  it("renders no link that is not https", async () => {
    service.getBillingInvoices.mockResolvedValue([
      {
        id: "stripe:in_3",
        number: "ONCH-0004",
        description: "Plan change",
        amountUsd: 1,
        status: "open",
        payUrl: SCRIPT_URL,
        canDownload: false,
        viewUrl: "http://invoice.stripe.com/i/a",
      },
    ]);
    renderCard();
    expect(await screen.findByText("ONCH-0004")).toBeTruthy();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
