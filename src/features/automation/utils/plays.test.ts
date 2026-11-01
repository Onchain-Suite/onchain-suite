import { describe, expect, it } from "vitest";

import {
  type ProtocolTemplate,
  type TemplateStep,
} from "../data/protocol-templates";
import { groupPlaysByFamily, templateReadiness } from "./plays";

const trigger = (
  requires?: Array<
    "contract" | "chain" | "segment" | "amount" | "form" | "campaign"
  >
): TemplateStep => ({
  kind: "trigger",
  label: "On-chain event",
  triggerType: "onchain",
  triggerPreset: "onchain_event",
  event: "Transfer",
  ...(requires ? { requires } : {}),
});

const play = (
  id: string,
  family: ProtocolTemplate["family"],
  steps: TemplateStep[]
): ProtocolTemplate => ({
  id,
  family,
  name: id,
  description: "",
  icon: "x",
  estimatedReach: 0,
  uses: 0,
  tags: [],
  steps,
});

describe("templateReadiness", () => {
  it("is ready when no trigger leaves required fields", () => {
    expect(templateReadiness(play("a", "welcome-onboard", [trigger()]))).toBe(
      "ready"
    );
  });

  it("needs setup when a trigger has required fields", () => {
    expect(
      templateReadiness(
        play("b", "welcome-onboard", [trigger(["contract", "chain"])])
      )
    ).toBe("needs-setup");
  });

  it("is ready when requires is present but empty", () => {
    expect(templateReadiness(play("c", "welcome-onboard", [trigger([])]))).toBe(
      "ready"
    );
  });
});

describe("groupPlaysByFamily", () => {
  it("groups by family in declared order and drops empty families", () => {
    const groups = groupPlaysByFamily([
      play("one", "keep-winback", [trigger()]),
      play("two", "welcome-onboard", [trigger()]),
      play("three", "welcome-onboard", [trigger()]),
    ]);
    // welcome-onboard is declared before keep-winback, and engage-grow drops out.
    expect(groups.map((g) => g.family.id)).toEqual([
      "welcome-onboard",
      "keep-winback",
    ]);
    expect(groups[0].plays.map((p) => p.id)).toEqual(["two", "three"]);
  });
});
