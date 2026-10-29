import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChannelIcons } from "./channel-icons";

describe("ChannelIcons", () => {
  it("renders one labelled glyph per present handle, with the handle in the title", () => {
    render(
      <ChannelIcons
        socials={{ twitter: "ruthybuilds", telegram: "tg_handle" }}
      />
    );
    expect(screen.getByTitle("X: ruthybuilds")).toBeInTheDocument();
    expect(screen.getByTitle("Telegram: tg_handle")).toBeInTheDocument();
    // channels with no handle are not rendered
    expect(screen.queryByTitle(/^Discord:/)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/^Farcaster:/)).not.toBeInTheDocument();
  });

  it("renders Discord and Farcaster when present", () => {
    render(
      <ChannelIcons socials={{ discord: "user#1234", farcaster: "ada.fc" }} />
    );
    expect(screen.getByTitle("Discord: user#1234")).toBeInTheDocument();
    expect(screen.getByTitle("Farcaster: ada.fc")).toBeInTheDocument();
  });

  it("renders nothing for a contact with no handles", () => {
    const { container } = render(<ChannelIcons socials={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
