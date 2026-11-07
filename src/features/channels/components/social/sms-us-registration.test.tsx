import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { problems, SmsUsRegistration } from "./sms-us-registration";
import type { SmsA2pSubmission } from "@/features/integrations/connections.service";
import { connectionsService } from "@/features/integrations/connections.service";

vi.mock("@/features/integrations/connections.service", () => ({
  connectionsService: {
    smsA2pStatus: vi.fn(),
    smsA2pSubmit: vi.fn(),
    smsA2pRefresh: vi.fn(),
  },
}));
vi.mock("@/features/settings/components/account/use-account-org", () => ({
  useAccountOrg: () => ({ organizationId: "org_1" }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const status = vi.mocked(connectionsService.smsA2pStatus);
const submit = vi.mocked(connectionsService.smsA2pSubmit);
const refresh = vi.mocked(connectionsService.smsA2pRefresh);

const base = {
  available: true,
  stage: null,
  hint: null,
  brandType: null,
  lastError: null,
  updatedAt: null,
  completedAt: null,
};

const renderCard = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: 0 }, mutations: { retry: 0 } },
        })
      }
    >
      <SmsUsRegistration />
    </QueryClientProvider>
  );

const VALID: SmsA2pSubmission = {
  email: "ops@acme.xyz",
  brandType: "LOW_VOLUME_STANDARD",
  business: {
    name: "Acme Labs Inc",
    type: "Corporation",
    industry: "FINTECH",
    idType: "EIN",
    idNumber: "12-3456789",
    regions: ["USA_AND_CANADA"],
    websiteUrl: "https://acme.xyz",
    companyType: "private",
  },
  representative: {
    firstName: "Ada",
    lastName: "Okafor",
    email: "ada@acme.xyz",
    phone: "+14155552671",
    title: "CEO",
    jobPosition: "CEO",
  },
  address: {
    street: "1 Market St",
    city: "SF",
    region: "CA",
    postalCode: "94105",
    country: "US",
  },
  campaign: {
    description:
      "Product updates and reward alerts for Acme users who opted in.",
    messageFlow:
      "Users enter their number in settings, tick a consent box, and reply YES.",
    samples: [
      "Acme: your weekly rewards are ready at acme.xyz. Reply STOP to opt out.",
      "Acme: staking v2 is live, details at acme.xyz/staking today.",
    ],
    hasEmbeddedLinks: true,
    hasEmbeddedPhone: false,
  },
};

describe("problems", () => {
  it("passes a complete submission", () => {
    expect(problems(VALID)).toEqual([]);
  });

  it("catches what carriers reject", () => {
    const p = problems({
      ...VALID,
      business: {
        ...VALID.business,
        websiteUrl: "acme",
        companyType: "public",
      },
      campaign: {
        ...VALID.campaign,
        description: "promos",
        samples: ["Big news friends, check it out!", ""],
      },
    });
    expect(p).toEqual(
      expect.arrayContaining([
        "Website must be a full URL, like https://acme.xyz.",
        "A public company needs its stock exchange and ticker.",
        "Describe the campaign in at least 40 characters.",
        "Add at least two sample messages.",
        'At least one sample must say how to opt out, e.g. "Reply STOP to opt out."',
      ])
    );
  });
});

describe("SmsUsRegistration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stays hidden when registration isn't available here", async () => {
    status.mockResolvedValue({ ...base, available: false });
    const { container } = renderCard();
    await waitFor(() => expect(status).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("offers to register when nothing is submitted", async () => {
    status.mockResolvedValue(base);
    renderCard();
    expect(
      await screen.findByRole("button", { name: "Register" })
    ).toBeInTheDocument();
  });

  it("shows review progress and checks on request", async () => {
    status.mockResolvedValue({
      ...base,
      stage: "CAMPAIGN_IN_REVIEW",
      hint: "Carriers are reviewing your campaign.",
    });
    refresh.mockResolvedValue({
      ...base,
      stage: "COMPLETE",
      hint: "Registered. Your number can text US phones.",
    });
    renderCard();
    expect(
      await screen.findByText("Carriers are reviewing your campaign.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Register" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Check now" }));
    expect(
      await screen.findByText("Registered. Your number can text US phones.")
    ).toBeInTheDocument();
  });

  it("shows the rejection reason and lets them resubmit", async () => {
    status.mockResolvedValue({
      ...base,
      stage: "BRAND_FAILED",
      hint: "The brand registration failed.",
      lastError: "EIN does not match.",
    });
    renderCard();
    expect(await screen.findByText("EIN does not match.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fix and resubmit" })
    ).toBeInTheDocument();
  });

  it("lists what is missing instead of submitting an incomplete form", async () => {
    status.mockResolvedValue(base);
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Register" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Legal business name is required."
    );
    expect(submit).not.toHaveBeenCalled();
  });
});
