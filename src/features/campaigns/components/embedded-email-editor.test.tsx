import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmbeddedEmailEditor } from "./embedded-email-editor";
import { BuilderBar } from "@/features/automation/components/flow-automation/flow-canvas/builder-bar";
import { useEmailSaveBlock } from "@/features/presend/hooks/use-email-save-block";
import {
  EMAIL_SAVE_BLOCKED_REASON,
  resetEmailSaveBlocks,
} from "@/features/presend/utils/email-save-block";

const EDITOR_ORIGIN = "https://editor.onchainsuite.com";

vi.mock("@/features/campaigns/campaigns.service", () => ({
  campaignsService: {
    getEditorSession: vi.fn(async () => ({
      editorUrl: `${EDITOR_ORIGIN}/`,
      token: "tok",
    })),
    setTemplate: vi.fn(async () => undefined),
  },
}));

vi.mock("@/features/templates/templates.service", () => ({
  templatesService: { create: vi.fn(), update: vi.fn() },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

/** A page elsewhere whose go-live depends on campaign c1's design. */
function GoLiveBar() {
  const block = useEmailSaveBlock({ campaignIds: ["c1"] });
  const noop = () => undefined;
  return (
    <BuilderBar
      name="Loop"
      status="paused"
      isNew={false}
      tab="builder"
      todo={0}
      issuesOpen={false}
      hasSteps
      saveState="idle"
      checking={false}
      saving={false}
      publishing={false}
      toggling={false}
      onName={noop}
      onNameCommit={noop}
      onTab={noop}
      onToggleIssues={noop}
      onCheck={noop}
      onSave={noop}
      onPublish={noop}
      onPause={noop}
      onTurnOn={noop}
      saveBlockedReason={block ? EMAIL_SAVE_BLOCKED_REASON : null}
    />
  );
}

const mount = async () => {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <EmbeddedEmailEditor campaignId="c1" onBack={() => undefined} />
      <GoLiveBar />
    </QueryClientProvider>
  );
  // The listener binds once the session (and so the trusted origin) is known.
  await screen.findByTitle("Email editor");
};

const post = (data: unknown, origin = EDITOR_ORIGIN) =>
  act(async () => {
    window.dispatchEvent(new MessageEvent("message", { data, origin }));
  });

const blocked = {
  type: "EMAIL_SAVE_BLOCKED",
  campaignId: "c1",
  designId: "d1",
  source: "autosave",
  status: "saveBlocked",
  code: "PRESEND_BLOCKED",
  message: "The email links to a public URL shortener (bit.ly).",
  rulesetVersion: "2026-11-21.1",
  checks: [
    {
      code: "URL_SHORTENER",
      message: "The email links to a public URL shortener (bit.ly).",
      fix: "Replace each shortened link with the full destination URL.",
      links: ["https://bit.ly/abc"],
    },
  ],
};

beforeEach(() => {
  resetEmailSaveBlocks();
  vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("EmbeddedEmailEditor - editor save blocks", () => {
  it("does nothing until the editor sends a block (editor not deployed yet)", async () => {
    await mount();
    expect(
      screen.queryByTestId("email-save-blocked-banner")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Turn on/ })).toBeEnabled();
  });

  it("EMAIL_SAVE_BLOCKED shows the banner and holds go-live with a reason", async () => {
    await mount();
    await post(blocked);

    const banner = screen.getByTestId("email-save-blocked-banner");
    expect(banner).toHaveTextContent(
      "This email isn't saved: The email links to a public URL shortener (bit.ly)."
    );
    expect(banner).toHaveTextContent(
      "Fix: Replace each shortened link with the full destination URL."
    );
    expect(banner).toHaveTextContent("https://bit.ly/abc");

    const publish = screen.getByRole("button", { name: /Publish/ });
    expect(publish).toBeDisabled();
    expect(screen.getByRole("button", { name: /Turn on/ })).toBeDisabled();
    expect(publish.parentElement).toHaveAttribute(
      "title",
      EMAIL_SAVE_BLOCKED_REASON
    );
  });

  it("EMAIL_SAVE_BLOCK_CLEARED removes the banner and re-enables go-live", async () => {
    await mount();
    await post(blocked);
    expect(screen.getByTestId("email-save-blocked-banner")).toBeInTheDocument();

    // Cleared by design id alone still clears the campaign's entry.
    await post({ type: "EMAIL_SAVE_BLOCK_CLEARED", designId: "d1" });
    expect(
      screen.queryByTestId("email-save-blocked-banner")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish/ })).toBeEnabled();
  });

  it("ignores save-block messages from any other origin", async () => {
    await mount();
    await post(blocked, "https://evil.example");
    expect(
      screen.queryByTestId("email-save-blocked-banner")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish/ })).toBeEnabled();

    await post(blocked);
    await post(
      { type: "EMAIL_SAVE_BLOCK_CLEARED", campaignId: "c1" },
      "https://evil.example"
    );
    expect(screen.getByTestId("email-save-blocked-banner")).toBeInTheDocument();
  });
});
