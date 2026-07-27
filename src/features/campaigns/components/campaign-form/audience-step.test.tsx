import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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

function Wrapper() {
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
      <AudienceStep form={form} lists={mockLists} segments={mockSegments} />
    </Form>
  );
}

describe("AudienceStep links", () => {
  it("renders UTM help links as secure external hyperlinks", () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <Wrapper />
      </QueryClientProvider>
    );

    const links = screen.getAllByRole("link", {
      name: /learn more about utm/i,
    });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.getAttribute("href") ?? "").toMatch(/^https:\/\//);
    }
  });

  it("links Segments to the Intelligence tab that actually exists", () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <Wrapper />
      </QueryClientProvider>
    );

    // /intelligence/segments has no route — Segments is a tab on
    // /intelligence — so the link must carry the ?tab= deep link.
    const link = screen.getByRole("link", { name: /Intelligence.*Segments/i });
    expect(link).toHaveAttribute("href", PRIVATE_ROUTES.INTELLIGENCE_SEGMENTS);
    expect(PRIVATE_ROUTES.INTELLIGENCE_SEGMENTS).toContain("tab=segments");
  });

  it("points Smart Sending at the org settings page that now exists", () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <Wrapper />
      </QueryClientProvider>
    );

    // GET/PUT /organization/settings/smart-sending shipped 2026-08-02, so the
    // "account settings" link finally has a real destination.
    const link = screen.getByRole("link", { name: /account settings/i });
    expect(link).toHaveAttribute(
      "href",
      `${PRIVATE_ROUTES.SETTINGS}?tab=account`
    );
  });

  it("does not hardcode a suppression window when the org setting is unavailable", () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <Wrapper />
      </QueryClientProvider>
    );

    // The window is read from the org setting; with no value resolved we say
    // "suppression window" rather than inventing a number like the old copy.
    expect(screen.queryByText(/10 hours/i)).not.toBeInTheDocument();
    expect(screen.getByText(/suppression window/i)).toBeInTheDocument();
  });

  it("explains recipients can be individual contacts, tags or segments", () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <Wrapper />
      </QueryClientProvider>
    );

    expect(
      screen.getByText(/Pick individual contacts by email/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/select the emails directly/i)).toBeInTheDocument();
  });
});
