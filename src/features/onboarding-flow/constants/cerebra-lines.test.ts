import { describe, expect, it } from "vitest";

import { cerebraLine } from "./cerebra-lines";
import { EMPTY_PROFILE, type ProjectProfile } from "./guided";

const line = (
  step: Parameters<typeof cerebraLine>[0]["step"],
  p: Partial<ProjectProfile>
) =>
  cerebraLine({
    step,
    profile: { ...EMPTY_PROFILE, ...p },
    contractLabel: null,
    role: "builder",
    handoffTo: null,
    picked: null,
  });

const named = { firstName: "Ada", name: "Acme", website: "acme.xyz" };

describe("cerebraLine", () => {
  it("asks what they have before the kind of business", () => {
    expect(line("project", named)).toMatch(/What do you have today/);
    expect(line("project", { ...named, start: "site" })).toMatch(
      /kind of business/
    );
  });

  it("asks a contract team for the address once the rest is in", () => {
    const done = { ...named, start: "chain" as const, sector: "DeFi" };
    expect(line("project", done)).toMatch(/contract address/);
    expect(line("project", { ...done, start: "site" })).toMatch(
      /That's everything, Ada/
    );
  });

  it("walks through the goal step", () => {
    expect(line("goal", {})).toMatch(/What do you want people to do/);
    expect(line("goal", { goal: "signup" })).toMatch(/Press Continue/);
  });
});
