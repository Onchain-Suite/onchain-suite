import { describe, expect, it } from "vitest";

import { handoffMinutes, handoffText, outstandingChannels } from "./handoff";

describe("outstandingChannels", () => {
  it("lists what is not live yet, in list order", () => {
    expect(
      outstandingChannels([
        { id: "email", label: "Email", status: "connected", blocker: null },
        { id: "push", label: "In-app push", status: "pending", blocker: "x" },
        { id: "x", label: "X", status: "none", blocker: "y" },
      ])
    ).toEqual(["push", "x"]);
  });
});

describe("handoffText", () => {
  const text = handoffText(["email", "telegram"], {
    origin: "https://app.onchainsuite.com/",
    workspace: "Acme",
  });

  it("names the workspace and numbers each task with its time", () => {
    expect(text.split("\n")[0]).toBe("Setup needed in OnchainSuite for Acme:");
    expect(text).toContain("1. Email sending domain (about 10 min)");
    expect(text).toContain("2. Telegram bot (about 5 min)");
  });

  it("gives the steps, the thing people get wrong, and where to do it", () => {
    expect(text).toContain(
      "   - Open @BotFather in Telegram and send /newbot."
    );
    expect(text).toContain(
      "   Watch out: Telegram cannot message anyone first."
    );
    expect(text).toContain(
      "   Do it here: https://app.onchainsuite.com/integrations?tab=channels&channel=email"
    );
    expect(text).toContain(
      "https://app.onchainsuite.com/integrations?tab=channels&channel=telegram"
    );
  });

  it("adds up the time when there is more than one task", () => {
    expect(handoffMinutes(["email", "telegram"])).toBe(15);
    expect(text).toContain("About 15 minutes of work in total.");
    expect(handoffText(["email"], { origin: "https://a.test" })).not.toContain(
      "in total"
    );
  });

  it("reads without a workspace name, and ends in one newline", () => {
    const one = handoffText(["x"], { origin: "https://a.test" });
    expect(one.split("\n")[0]).toBe("Setup needed in OnchainSuite:");
    expect(one.endsWith("\n")).toBe(true);
    expect(one.endsWith("\n\n")).toBe(false);
  });

  it("is only the heading when nothing was picked", () => {
    expect(handoffText([], { origin: "https://a.test" })).toBe(
      "Setup needed in OnchainSuite:\n"
    );
  });
});
