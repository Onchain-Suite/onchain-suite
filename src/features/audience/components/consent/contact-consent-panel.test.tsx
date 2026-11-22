import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContactConsentPanel } from "./contact-consent-panel";

const getProfileConsent = vi.fn();
vi.mock("../../consent.service", () => ({
  consentService: {
    getProfileConsent: (...a: unknown[]) => getProfileConsent(...a),
  },
}));

const renderPanel = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ContactConsentPanel profileId="ct_1" open />
    </QueryClientProvider>
  );

const rec = (over: Record<string, unknown>) => ({
  id: "r",
  consentSource: "import",
  consentMethod: null,
  consentAt: null,
  consentAtKnown: false,
  consentText: null,
  consentProof: null,
  consentIp: null,
  doubleOptIn: false,
  originId: null,
  recordedAt: null,
  storedAs: "record",
  ...over,
});

describe("ContactConsentPanel", () => {
  beforeEach(() => getProfileConsent.mockReset());

  it("shows the current source, date, double opt-in, proof and history", async () => {
    const current = rec({
      id: "r2",
      consentSource: "integration:mailchimp",
      consentAt: "2024-03-01T00:00:00.000Z",
      consentAtKnown: true,
      doubleOptIn: true,
      consentProof: "https://example.com/form",
    });
    getProfileConsent.mockResolvedValue({
      contactId: "ct_1",
      current,
      records: [current, rec({ id: "r1", consentSource: "api" })],
    });
    renderPanel();
    expect(
      await screen.findAllByText("Migrated from Mailchimp")
    ).not.toHaveLength(0);
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "https://example.com/form" })
    ).toBeInTheDocument();
    expect(screen.getByText("Added through the API")).toBeInTheDocument();
    expect(screen.getByText("Date unknown")).toBeInTheDocument();
  });

  it("says when no opt-in is recorded", async () => {
    getProfileConsent.mockResolvedValue({
      contactId: "ct_1",
      current: null,
      records: [],
    });
    renderPanel();
    expect(await screen.findByText(/No opt-in recorded/)).toBeInTheDocument();
  });
});
