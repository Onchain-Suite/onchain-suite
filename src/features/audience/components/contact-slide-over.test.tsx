import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AudienceProfile } from "../audience.service";
import { ContactSlideOver } from "./contact-slide-over";

const noop = vi.fn();

function renderSlideOver(profile: AudienceProfile) {
  return render(
    <ContactSlideOver
      profile={profile}
      open
      onOpenChange={noop}
      availableTags={[]}
      applyingTags={false}
      onApplyTags={noop}
      onCompose={noop}
      segments={[]}
      addingToSegment={false}
      onAddToSegment={noop}
    />
  );
}

describe("ContactSlideOver", () => {
  it("shows a lifecycle stage badge", () => {
    renderSlideOver({
      id: "c1",
      walletAddress: "0x1111111111111111111111111111111111111111",
      healthScore: 10,
      channels: { email: false, inapp: false },
    });
    // Low health -> at_risk stage label.
    expect(screen.getByText("At risk")).toBeInTheDocument();
  });

  it("renders a social channel row only when that channel is reachable", () => {
    renderSlideOver({
      id: "c2",
      walletAddress: "0x2222222222222222222222222222222222222222",
      channels: { email: false, inapp: true, x: true },
    });
    // X is reachable -> its row renders; Discord is not -> no row.
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.queryByText("Discord")).not.toBeInTheDocument();
    expect(screen.queryByText("Telegram")).not.toBeInTheDocument();
  });

  it("enables Send a test for a push-reachable contact with no email", () => {
    renderSlideOver({
      id: "c3",
      walletAddress: "0x3333333333333333333333333333333333333333",
      channels: { email: false, inapp: true },
    });
    expect(
      screen.getByRole("button", { name: /send a test/i })
    ).not.toBeDisabled();
  });

  it("disables Send a test when reachable on no channel", () => {
    renderSlideOver({
      id: "c4",
      channels: { email: false, inapp: false },
    });
    expect(screen.getByRole("button", { name: /send a test/i })).toBeDisabled();
  });

  it("drives the identity source from data, not a hardcoded literal", () => {
    renderSlideOver({
      id: "c5",
      walletAddress: "0x5555555555555555555555555555555555555555",
      identitySource: "App sign-in",
      channels: { email: false, inapp: true },
    });
    expect(
      screen.getByText(/identity source: app sign-in/i)
    ).toBeInTheDocument();
  });
});
