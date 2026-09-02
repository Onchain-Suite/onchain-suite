import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { Form } from "@/components/ui/form";

import type { List, Segment } from "../../../campaigns/types";
import type { CampaignFormData } from "../../validations";
import { AudienceStep } from "./audience-step";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children?: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("./audience-selector", () => ({
  AudienceSelector: () => <div data-testid="audience-selector" />,
}));

const mockLists: List[] = [];
const mockSegments: Segment[] = [
  { id: "new-subscribers", name: "New Subscribers", count: 42, starred: true },
];

function Wrapper({ segments = mockSegments }: { segments?: Segment[] }) {
  const form = useForm<CampaignFormData, unknown, CampaignFormData>({
    defaultValues: {
      campaignName: "Test",
      campaignType: "email-blast",
      selectedAudiences: [],
      smartSending: true,
      trackingParameters: true,
      selectedTemplate: "",
      emailSubject: "Subject",
      previewText: "",
      senderName: "Sender",
      senderEmail: "sender@example.com",
      useReplyTo: true,
      replyToEmail: "reply@example.com",
      sendOption: "now",
      timezone: "UTC",
    },
  });

  return (
    <Form {...form}>
      <AudienceStep form={form} lists={mockLists} segments={segments} />
    </Form>
  );
}

function renderStep(props: { segments?: Segment[] } = {}) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <Wrapper {...props} />
    </QueryClientProvider>
  );
}

describe("AudienceStep links", () => {
  it("links Segments to the Intelligence tab that actually exists", () => {
    // With no saved segments the Segments tab shows the empty-state CTA whose
    // link is the only cross-link to the segments surface. /intelligence/segments
    // has no route - Segments is a tab on /intelligence - so the link must carry
    // the ?tab= deep link.
    renderStep({ segments: [] });

    // Segments is no longer the default tab (Everyone is first now), so open it.
    fireEvent.click(screen.getByRole("button", { name: "Segments" }));

    const link = screen.getByRole("link", { name: /create one/i });
    expect(link).toHaveAttribute("href", PRIVATE_ROUTES.INTELLIGENCE_SEGMENTS);
    expect(PRIVATE_ROUTES.INTELLIGENCE_SEGMENTS).toContain("tab=segments");
  });

  it("points Smart Sending at the org settings page that now exists", () => {
    // GET/PUT /organization/settings/smart-sending shipped 2026-08-02, so the
    // Smart sending "org setting" link finally has a real destination.
    renderStep();

    const link = screen.getByRole("link", { name: /org setting/i });
    expect(link).toHaveAttribute(
      "href",
      `${PRIVATE_ROUTES.SETTINGS}?tab=account`
    );
  });

  it("does not hardcode a suppression window when the org setting is unavailable", () => {
    // The window is read from the org smart-sending setting; with no value
    // resolved the copy says "in the last window" rather than inventing a number
    // like the old "10 hours" string.
    renderStep();

    expect(screen.queryByText(/\d+\s*hours\b/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/heard from you in the last\s+window/i)
    ).toBeInTheDocument();
  });

  it("explains the recipient options: segments, lists, tags, contacts or everyone", () => {
    // The step's lead-in describes what a recipient set can be built from - the
    // rebuilt copy lists segments/lists/tags/contacts/everyone instead of the old
    // "Pick individual contacts by email" text.
    renderStep();

    expect(
      screen.getByText(/choose segments, lists, tags, contacts, or everyone/i)
    ).toBeInTheDocument();
  });
});
