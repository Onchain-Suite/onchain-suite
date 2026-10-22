import { describe, expect, it } from "vitest";

import { stepKindLabel, stepSummary } from "./step-summary";

describe("stepKindLabel", () => {
  it("names known steps and humanises the rest", () => {
    expect(stepKindLabel("send_email")).toBe("Send an email");
    expect(stepKindLabel("branch")).toBe("If / else");
    expect(stepKindLabel("swap_completed")).toBe("Swap completed");
    expect(stepKindLabel()).toBe("Step");
  });
});

describe("stepSummary", () => {
  it("says what a configured step does", () => {
    expect(stepSummary("telegram", { text: "Claim your rewards" })).toBe(
      "Claim your rewards"
    );
    expect(stepSummary("email", { subject: "Welcome aboard" })).toBe(
      "Welcome aboard"
    );
    expect(stepSummary("wait", { seconds: 172800 })).toBe("2 days");
    expect(
      stepSummary("wait", { mode: "until_event", waitFor: "email_opened" })
    ).toBe("Until email opened");
    expect(
      stepSummary("tag", { actionType: "add_tag", tags: ["vip", "whale"] })
    ).toBe("vip, whale");
    expect(stepSummary("webhook", { url: "https://api.acme.xyz/hook" })).toBe(
      "POST api.acme.xyz"
    );
    expect(
      stepSummary("branch", {
        rules: [{ field: "tier", operator: "eq", value: "gold" }, {}],
      })
    ).toBe("tier eq gold (+1)");
  });

  it("is empty for a step with nothing set, and ignores trigger placeholders", () => {
    expect(stepSummary("email", {})).toBe("");
    expect(
      stepSummary("trigger", { contract: "Select Contract", chain: "base" })
    ).toBe("base");
  });
});
