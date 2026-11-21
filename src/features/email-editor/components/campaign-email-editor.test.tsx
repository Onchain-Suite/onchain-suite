import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DocNode } from "../types/email-doc";
import { CampaignEmailEditor } from "./campaign-email-editor";
import { campaignsService } from "@/features/campaigns/campaigns.service";
import { block } from "@/features/presend/test/fixtures";
import {
  findEmailSaveBlock,
  resetEmailSaveBlocks,
} from "@/features/presend/utils/email-save-block";

interface StubProps {
  saveLabel: string;
  saveFailed?: boolean;
  onChange: (doc: DocNode, footer: string) => void;
  onBack: () => void;
  onDone: () => void;
}

/** Stands in for the Tiptap editor: its own state, like the real one. */
function StubEditor(p: StubProps) {
  const [text, setText] = useState("hello");
  return (
    <div>
      <span data-testid="save-label" data-failed={String(!!p.saveFailed)}>
        {p.saveLabel}
      </span>
      <textarea
        aria-label="body"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          p.onChange(
            {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: e.target.value }],
                },
              ],
            },
            ""
          );
        }}
      />
      <button type="button" onClick={p.onBack}>
        Back
      </button>
    </div>
  );
}

vi.mock("next/dynamic", () => ({
  default: () => (props: StubProps) => <StubEditor {...props} />,
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

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("../hooks/use-email-source", () => ({
  useEmailSource: () => ({
    isError: false,
    data: {
      design: { kind: "doc", doc: { type: "doc", content: [] }, footer: "" },
      preheader: "",
    },
  }),
}));

vi.mock("@/features/campaigns/campaigns.service", () => ({
  campaignsService: { editorSaved: vi.fn(), setTemplate: vi.fn() },
}));
vi.mock("@/features/templates/templates.service", () => ({
  templatesService: { update: vi.fn(), create: vi.fn() },
}));

const editorSaved = vi.mocked(campaignsService.editorSaved);

const shortener = (links: string[]) => ({
  ...block("URL_SHORTENER"),
  details: { links },
});

/** Exactly what campaignsService throws for the backend's 422. */
const presendBlocked = (checks: unknown[]) =>
  Object.assign(new Error("[HTTP 422] An error occurred"), {
    code: "PRESEND_BLOCKED",
    details: {
      code: "PRESEND_BLOCKED",
      message: "An error occurred",
      rulesetVersion: "2026-11-21.1",
      checks,
    },
  });

const type = async (value: string) => {
  fireEvent.change(screen.getByLabelText("body"), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1300);
  });
};

const dialog = () => screen.queryByTestId("save-blocked-dialog");
const closeDialog = () =>
  fireEvent.click(screen.getByRole("button", { name: "Back to the email" }));

const mount = () =>
  render(<CampaignEmailEditor campaignId="c1" title="Hi" onBack={vi.fn()} />);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetEmailSaveBlocks();
  editorSaved.mockReset();
  toastError.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("CampaignEmailEditor save refused by a pre-send block", () => {
  it("manual save: dialog, Not saved, store set, content kept", async () => {
    const onBack = vi.fn();
    editorSaved.mockRejectedValue(
      presendBlocked([shortener(["https://bit.ly/x"])])
    );
    render(<CampaignEmailEditor campaignId="c1" title="Hi" onBack={onBack} />);

    fireEvent.change(screen.getByLabelText("body"), {
      target: { value: "see https://bit.ly/x" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
    });

    expect(onBack).not.toHaveBeenCalled();
    expect(dialog()).toHaveTextContent(
      "Not saved: this email can't go out while it contains a link shortener"
    );
    expect(dialog()).toHaveTextContent("URL_SHORTENER message");
    expect(dialog()).toHaveTextContent("URL_SHORTENER fix");
    expect(dialog()).toHaveTextContent("https://bit.ly/x");
    expect(screen.getByTestId("save-label")).toHaveTextContent(/^Not saved$/);
    expect(screen.getByTestId("save-label")).toHaveAttribute(
      "data-failed",
      "true"
    );
    expect(screen.getByLabelText("body")).toHaveValue("see https://bit.ly/x");
    expect(screen.getByTestId("email-save-blocked-banner")).toBeInTheDocument();
    expect(findEmailSaveBlock({ campaignIds: ["c1"] })).toEqual(
      expect.objectContaining({
        source: "save",
        code: "PRESEND_BLOCKED",
        checks: [expect.objectContaining({ links: ["https://bit.ly/x"] })],
      })
    );
    // The dialog replaces the generic "didn't save" toast.
    expect(toastError).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("An error occurred");
    // The offending link is outlined in the canvas.
    expect(screen.getByTestId("save-block-highlight").textContent).toContain(
      '.eed-canvas a[href="https://bit.ly/x"]'
    );
  });

  it("autosave: opens once, not again for the same codes, again when they change", async () => {
    mount();
    editorSaved.mockRejectedValue(
      presendBlocked([shortener(["https://bit.ly/x"])])
    );
    await type("a");
    expect(dialog()).toBeInTheDocument();
    closeDialog();
    expect(dialog()).not.toBeInTheDocument();

    await type("ab");
    expect(editorSaved).toHaveBeenCalledTimes(2);
    expect(dialog()).not.toBeInTheDocument();
    expect(screen.getByTestId("save-label")).toHaveTextContent(/^Not saved$/);

    editorSaved.mockRejectedValue(
      presendBlocked([
        shortener(["https://bit.ly/x"]),
        block("SEED_PHRASE_REQUEST"),
      ])
    );
    await type("abc");
    expect(dialog()).toHaveTextContent(
      "contains a link shortener and asks for a seed phrase or private key"
    );
    expect(findEmailSaveBlock({ campaignIds: ["c1"] })?.checks).toHaveLength(2);
  });

  it("clears the store, banner and dialog on the next successful save", async () => {
    mount();
    editorSaved.mockRejectedValueOnce(
      presendBlocked([block("SEED_PHRASE_REQUEST")])
    );
    await type("send me your seed phrase");
    expect(findEmailSaveBlock({ campaignIds: ["c1"] })).not.toBeNull();

    editorSaved.mockResolvedValueOnce({ success: true });
    await type("hello");
    expect(findEmailSaveBlock({ campaignIds: ["c1"] })).toBeNull();
    expect(dialog()).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("email-save-blocked-banner")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("save-label")).toHaveTextContent(
      "Saved to this campaign"
    );
  });

  it("other errors keep the ordinary Not saved path", async () => {
    const onBack = vi.fn();
    editorSaved.mockRejectedValue(new Error("[HTTP 500] Database down"));
    render(<CampaignEmailEditor campaignId="c1" title="Hi" onBack={onBack} />);

    await type("a");
    expect(dialog()).not.toBeInTheDocument();
    expect(findEmailSaveBlock({ campaignIds: ["c1"] })).toBeNull();
    expect(screen.getByTestId("save-label")).toHaveTextContent(
      "Not saved. [HTTP 500] Database down"
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
    });
    expect(onBack).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it("never shows the generic placeholder for an unparsed failure", async () => {
    editorSaved.mockRejectedValue(
      Object.assign(new Error("[HTTP 400] An error occurred"), {
        code: "BAD_REQUEST",
        details: { message: "Body too large" },
      })
    );
    mount();
    await type("a");
    expect(screen.getByTestId("save-label")).toHaveTextContent(
      "Not saved. Body too large"
    );
  });
});
