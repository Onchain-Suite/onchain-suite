import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CampaignFormData } from "../../validations";
import { TemplateStep } from "./template-step";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// The message form and the gallery are exercised elsewhere; here we only need a
// handle to trigger the "open the editor" path.
vi.mock("./email-message-form", () => ({
  EmailMessageForm: () => <div data-testid="email-message-form" />,
}));
vi.mock("./template-selector", () => ({
  TemplateSelector: ({
    onCreateEditor,
  }: {
    onCreateEditor: (opts?: { templateName?: string }) => void;
  }) => (
    <button type="button" onClick={() => onCreateEditor()}>
      create-editor
    </button>
  ),
}));

const updateContentMock = vi.fn().mockResolvedValue({});
vi.mock("../../campaigns.service", () => ({
  campaignsService: {
    updateContent: (...args: unknown[]) => updateContentMock(...args),
    setTemplate: vi.fn().mockResolvedValue({}),
    editorSaved: vi.fn().mockResolvedValue({}),
    setPushContent: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock("@/features/templates/templates.service", () => ({
  templatesService: { get: vi.fn().mockResolvedValue({}) },
  extractTemplatePushContent: vi.fn(),
}));

function Harness() {
  const form = useForm<CampaignFormData, unknown, CampaignFormData>({
    defaultValues: {
      channel: "email",
      emailSubject: "Weekly digest",
      previewText: "Catch up on this week",
      senderName: "Sender",
      senderEmail: "sender@example.com",
      senderIdentityId: "ident_1",
      useReplyTo: false,
    } as Partial<CampaignFormData> as CampaignFormData,
  });
  return (
    <TemplateStep
      form={form}
      campaignId="camp_1"
      verifiedSenderIdentities={[]}
      senderIdentitiesLoading={false}
      canSendEmail
    />
  );
}

describe("TemplateStep openEditor", () => {
  beforeEach(() => {
    pushMock.mockClear();
    updateContentMock.mockClear();
  });

  it("persists the subject and preview text to the draft before opening the editor", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("create-editor"));

    await waitFor(() => expect(pushMock).toHaveBeenCalled());

    // The message must be flushed so it survives the round-trip to the builder.
    expect(updateContentMock).toHaveBeenCalledWith(
      "camp_1",
      expect.objectContaining({
        subject: "Weekly digest",
        previewText: "Catch up on this week",
      })
    );
    // And it navigates to the editor for this campaign.
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("/campaigns/editor?")
    );
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("campaign=camp_1")
    );
  });

  it("flushes the sender-identity link so it survives the editor round-trip", async () => {
    // Regression: the flush dropped senderIdentityId, so a returning draft had
    // the address but no link. The schema then treats the blank sender name as
    // required and Continue fails validation silently — the "dead button" bug.
    render(<Harness />);
    fireEvent.click(screen.getByText("create-editor"));

    await waitFor(() => expect(updateContentMock).toHaveBeenCalled());

    expect(updateContentMock).toHaveBeenCalledWith(
      "camp_1",
      expect.objectContaining({ senderIdentityId: "ident_1" })
    );
  });
});
