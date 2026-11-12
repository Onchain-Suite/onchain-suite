import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChannelReadiness } from "../types/channel";
import type { ReadinessInputs } from "../utils/readiness";
import { ChannelsTab } from "./channels-tab";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => "/integrations",
  useSearchParams: () => nav.params,
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/features/common/layout/components/org-switcher-context", () => ({
  useOrgSwitcherContextOptional: () => ({ activeOrg: { name: "Acme" } }),
}));
// The channel's own page is not under test here; only that the right one opens.
vi.mock("./channel-detail", () => ({
  ChannelDetail: ({
    channel,
    onBack,
  }: {
    channel: ChannelReadiness;
    onBack: () => void;
  }) => (
    <div>
      <p>Detail for {channel.id}</p>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </div>
  ),
}));

const inputs: ReadinessInputs = {
  domainStatuses: ["verified"],
  webPush: { hasKey: false, sessionCount: null },
  mobilePush: { hasCredential: false, hasVerified: false },
};
const readiness: ChannelReadiness[] = [
  { id: "email", label: "Email", status: "connected", blocker: null },
  {
    id: "push",
    label: "In-app push",
    status: "none",
    blocker: "In-app push not set up",
  },
  {
    id: "telegram",
    label: "Telegram",
    status: "none",
    blocker: "No bot connected",
  },
];
const hook = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("../hooks/use-channel-readiness", () => ({
  useChannelReadiness: () => hook.value,
}));

function renderAt(query: string) {
  nav.params = new URLSearchParams(query);
  return render(<ChannelsTab />);
}

describe("ChannelsTab", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    hook.value = { readiness, inputs, isLoading: false };
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("says how many channels can send, and what blocks each of the rest", () => {
    renderAt("tab=channels");
    expect(screen.getByText(/1 of 3 can send\./)).toBeTruthy();
    expect(screen.getByText("No bot connected")).toBeTruthy();
    // A live channel says who it reaches instead.
    expect(screen.getByText("Anyone with an email address")).toBeTruthy();
    expect(screen.getByText("Manage")).toBeTruthy();
    expect(screen.getAllByText("Set up")).toHaveLength(2);
  });

  // A link from the setup checklist, a campaign or a handed-over task has to
  // land on the channel it names.
  it("opens the channel named in the address", () => {
    renderAt("tab=channels&channel=telegram");
    expect(screen.getByText("Detail for telegram")).toBeTruthy();
  });

  it("stays on the list for a channel that does not exist", () => {
    renderAt("tab=channels&channel=fax");
    expect(screen.getByText(/can send\./)).toBeTruthy();
  });

  it("puts the channel in the address when a row is opened", () => {
    renderAt("tab=channels&from=home");
    fireEvent.click(screen.getByRole("button", { name: /Telegram/ }));
    expect(nav.replace).toHaveBeenCalledWith(
      "/integrations?tab=channels&from=home&channel=telegram",
      { scroll: false }
    );
  });

  it("takes it out again on the way back", () => {
    renderAt("tab=channels&channel=push");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(nav.replace).toHaveBeenCalledWith("/integrations?tab=channels", {
      scroll: false,
    });
  });

  it("hands over only what is not live, as text with a link to each", async () => {
    renderAt("tab=channels");
    fireEvent.click(
      screen.getByRole("button", { name: "Send setup to someone" })
    );
    expect(await screen.findByText("In-app push SDK")).toBeTruthy();
    expect(screen.getByText("Telegram bot")).toBeTruthy();
    expect(screen.queryByText("Email sending domain")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Copy instructions" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = String(writeText.mock.calls[0]?.[0]);
    expect(text).toContain("Setup needed in OnchainSuite for Acme:");
    expect(text).toContain("1. In-app push SDK");
    expect(text).toContain("2. Telegram bot");
    expect(text).toContain("/integrations?tab=channels&channel=telegram");
    expect(text).not.toContain("Email sending domain");
  });

  it("offers nothing to hand over once every channel is live", () => {
    hook.value = {
      readiness: readiness.map((c) => ({
        ...c,
        status: "connected",
        blocker: null,
      })),
      inputs,
      isLoading: false,
    };
    renderAt("tab=channels");
    expect(
      screen.queryByRole("button", { name: "Send setup to someone" })
    ).toBeNull();
    expect(screen.getByText(/3 of 3 can send\./)).toBeTruthy();
  });
});
